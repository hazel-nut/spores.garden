/**
 * Guestbook Layout
 *
 * Displays guestbook entries and allows visitors to sign.
 * Uses backlinks to query entries stored in visitors' repos.
 */

import { getBacklinks, getRecord, getProfile } from '../at-client';
import { isLoggedIn, login, createRecord, getCurrentDid } from '../oauth';
import { getSiteOwnerDid } from '../config';
import { registerLayout } from './index';

const GUESTBOOK_COLLECTION = 'garden.spores.guestbook.entry';
const POLL_INTERVAL = 10000; // Poll every 10 seconds

/**
 * Register the guestbook layout
 */
registerLayout('guestbook', async (fields, record, options = {}) => {
  const container = document.createElement('div');
  container.className = 'layout-guestbook';

  // Track loaded entry URIs to detect new entries
  const loadedUris = new Set<string>();
  (container as any).__guestbookUris = loadedUris;

  // Entries list
  const entriesList = document.createElement('div');
  entriesList.className = 'guestbook-entries';
  entriesList.innerHTML = '<p class="loading">Loading guestbook...</p>';
  container.appendChild(entriesList);

  // Sign form
  const form = await createSignForm(container);
  container.appendChild(form);

  // Load entries asynchronously
  await loadEntries(entriesList, loadedUris, false);

  // Set up polling for new entries
  let pollInterval: ReturnType<typeof setInterval> | null = setInterval(() => {
    loadEntries(entriesList, loadedUris, true);
    updateRelativeTimes(entriesList);
  }, POLL_INTERVAL);

  // Cleanup function - ensures all resources are released
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;

    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    observer.disconnect();
    window.removeEventListener('beforeunload', cleanup);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };

  // Pause/resume polling based on page visibility
  const handleVisibilityChange = () => {
    if (document.hidden) {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    } else if (!pollInterval && !cleaned && document.body.contains(container)) {
      pollInterval = setInterval(() => {
        loadEntries(entriesList, loadedUris, true);
        updateRelativeTimes(entriesList);
      }, POLL_INTERVAL);
    }
  };

  // Watch for container removal
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.removedNodes) {
        if (node === container || (node as Element)?.contains?.(container)) {
          cleanup();
          return;
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('beforeunload', cleanup);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return container;
});

/**
 * Create the sign form
 */
async function createSignForm(container) {
  const form = document.createElement('form');
  form.className = 'guestbook-form';

  if (!isLoggedIn()) {
    // Get site owner's handle
    let ownerHandle = '';
    const siteOwnerDid = getSiteOwnerDid();
    if (siteOwnerDid) {
      try {
        const profile = await getProfile(siteOwnerDid);
        if (profile?.handle) {
          ownerHandle = `@${profile.handle}`;
        }
      } catch (error) {
        console.warn('Failed to fetch site owner profile:', error);
      }
    }

    // Show login prompt
    const loginPrompt = document.createElement('div');
    loginPrompt.className = 'guestbook-login';
    loginPrompt.innerHTML = `
      <p>Login to sign ${ownerHandle || '[@handle insert user handle]'}'s guestbook</p>
      <input type="text" placeholder="your.handle.com" class="input guestbook-handle">
      <button type="submit" class="button">Log in</button>
    `;

    form.appendChild(loginPrompt);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const handle = form.querySelector('.guestbook-handle').value.trim();
      if (handle) {
        await login(handle);
      }
    });
  } else {
    // Show sign form
    form.innerHTML = `
      <textarea
        placeholder="Leave a message..."
        class="textarea guestbook-message"
        maxlength="1000"
        rows="3"
      ></textarea>
      <button type="submit" class="button">Sign Guestbook</button>
    `;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const textarea = form.querySelector('.guestbook-message');
      const message = textarea.value.trim();

      if (!message) return;

      const button = form.querySelector('button');
      button.disabled = true;
      button.textContent = 'Signing...';

      try {
        const signedEntry = await signGuestbook(message);
        textarea.value = '';
        button.textContent = 'Signed!';

        // Immediately show the user's entry (don't wait for Constellation indexing)
        const entriesList = container.querySelector('.guestbook-entries');
        const loadedUris = (container as any).__guestbookUris || new Set<string>();

        if (entriesList && !loadedUris.has(signedEntry.uri)) {
          loadedUris.add(signedEntry.uri);

          // Fetch user's profile for display
          let profile = null;
          try {
            profile = await getProfile(signedEntry.authorDid);
          } catch {
            // Profile fetch is optional
          }

          const entry = {
            message: signedEntry.message,
            createdAt: signedEntry.createdAt,
            uri: signedEntry.uri,
            authorDid: signedEntry.authorDid,
            authorHandle: profile?.handle,
            authorName: profile?.displayName,
            authorAvatar: profile?.avatar
          };

          const entryElement = renderEntry(entry);

          // Clear empty state if present, then prepend new entry
          const emptyState = entriesList.querySelector('.empty, .loading');
          if (emptyState) {
            entriesList.innerHTML = '';
          }
          entriesList.insertBefore(entryElement, entriesList.firstChild);
        }

        setTimeout(() => {
          button.textContent = 'Sign Guestbook';
          button.disabled = false;
        }, 2000);
      } catch (error) {
        console.error('Failed to sign guestbook:', error);
        button.textContent = 'Error - Try Again';
        button.disabled = false;
      }
    });
  }

  return form;
}

/**
 * Validate guestbook message
 */
function validateMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    throw new Error('Message is required');
  }

  const trimmed = message.trim();

  if (trimmed.length === 0) {
    throw new Error('Message cannot be empty');
  }

  if (trimmed.length > 1000) {
    throw new Error('Message too long (max 1000 characters)');
  }

  return trimmed;
}

export interface SignedEntry {
  uri: string;
  message: string;
  createdAt: string;
  authorDid: string;
}

/**
 * Sign the guestbook
 * Returns the created entry data for immediate display
 */
async function signGuestbook(message: string): Promise<SignedEntry> {
  const siteOwnerDid = getSiteOwnerDid();
  if (!siteOwnerDid) {
    throw new Error('No site owner DID');
  }

  const validatedMessage = validateMessage(message);
  const createdAt = new Date().toISOString();

  const record = {
    $type: GUESTBOOK_COLLECTION,
    subject: siteOwnerDid,
    message: validatedMessage,
    createdAt
  };

  const result = await createRecord(GUESTBOOK_COLLECTION, record);

  return {
    uri: result.uri,
    message: validatedMessage,
    createdAt,
    authorDid: getCurrentDid()
  };
}

/**
 * Load guestbook entries via Constellation backlinks
 * @param container - The container element to render entries into
 * @param loadedUris - Set of URIs that have already been loaded
 * @param incremental - If true, only add new entries. If false, replace all entries.
 */
async function loadEntries(container: HTMLElement, loadedUris: Set<string>, incremental: boolean = false) {
  const siteOwnerDid = getSiteOwnerDid();
  if (!siteOwnerDid) {
    if (!incremental) {
      container.innerHTML = '<p class="empty">No guestbook entries yet. Be the first to sign!</p>';
    }
    return;
  }

  try {
    // Query Constellation for backlinks
    const backlinks = await getBacklinks(
      siteOwnerDid,
      `${GUESTBOOK_COLLECTION}:subject`
    );

    if (!backlinks.records || backlinks.records.length === 0) {
      if (!incremental) {
        container.innerHTML = '<p class="empty">No guestbook entries yet. Be the first to sign!</p>';
      }
      return;
    }

    // Fetch each entry and author profile
    // Use Slingshot for backlink records since they come from many different DIDs
    // and Slingshot's cache is faster than resolving each PDS individually
    const entries = await Promise.all(
      backlinks.records.map(async (link) => {
        try {
          const record = await getRecord(link.did, link.collection, link.rkey, { useSlingshot: true });
          if (!record) return null;

          // Skip if we've already loaded this entry (for incremental updates)
          if (incremental && loadedUris.has(record.uri)) {
            return null;
          }

          let profile = null;
          try {
            profile = await getProfile(link.did);
          } catch {
            // Profile fetch is optional
          }

          return {
            ...record.value,
            uri: record.uri,
            authorDid: link.did,
            authorHandle: profile?.handle,
            authorName: profile?.displayName,
            authorAvatar: profile?.avatar
          };
        } catch (error) {
          console.warn(`Failed to fetch entry from ${link.did}:`, error);
          return null;
        }
      })
    );

    // Filter out nulls and sort by date
    const validEntries = entries
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (validEntries.length === 0) {
      if (!incremental) {
        container.innerHTML = '<p class="empty">No guestbook entries yet. Be the first to sign!</p>';
      }
      return;
    }

    if (incremental) {
      // Add only new entries to the top of the list
      const newEntries = validEntries.filter(entry => !loadedUris.has(entry.uri));
      if (newEntries.length > 0) {
        // Insert new entries at the top, maintaining sort order
        const fragment = document.createDocumentFragment();
        newEntries.forEach(entry => {
          loadedUris.add(entry.uri);
          const entryElement = renderEntry(entry);
          fragment.appendChild(entryElement);
        });
        
        // If container has existing entries, insert before them
        // Otherwise, clear loading/empty state and add entries
        if (container.children.length > 0 && !container.querySelector('.loading, .empty, .error')) {
          container.insertBefore(fragment, container.firstChild);
        } else {
          container.innerHTML = '';
          container.appendChild(fragment);
        }
      }
    } else {
      // Full reload: replace all entries
      container.innerHTML = '';
      validEntries.forEach(entry => {
        loadedUris.add(entry.uri);
        container.appendChild(renderEntry(entry));
      });
    }

    // Update relative times for all entries
    updateRelativeTimes(container);
  } catch (error) {
    console.error('Failed to load guestbook entries:', error);
    if (!incremental) {
      container.innerHTML = '<p class="error">Failed to load guestbook entries</p>';
    }
  }
}

/**
 * Render a single guestbook entry
 */
function renderEntry(entry) {
  const div = document.createElement('div');
  div.className = 'guestbook-entry';

  const header = document.createElement('div');
  header.className = 'guestbook-entry-header';

  if (entry.authorAvatar) {
    const avatar = document.createElement('img');
    avatar.src = entry.authorAvatar;
    avatar.alt = '';
    avatar.className = 'guestbook-avatar';
    header.appendChild(avatar);
  }

  const authorInfo = document.createElement('div');
  authorInfo.className = 'guestbook-author';

  const name = document.createElement('span');
  name.className = 'guestbook-name';
  name.textContent = entry.authorName || entry.authorHandle || entry.authorDid.slice(0, 20);
  authorInfo.appendChild(name);

  if (entry.authorHandle) {
    const handle = document.createElement('a');
    handle.className = 'guestbook-handle';
    handle.href = `https://bsky.app/profile/${entry.authorHandle}`;
    handle.target = '_blank';
    handle.rel = 'noopener noreferrer';
    handle.textContent = `@${entry.authorHandle}`;
    authorInfo.appendChild(handle);
  }

  header.appendChild(authorInfo);

  const date = document.createElement('time');
  date.className = 'guestbook-date';
  date.dateTime = entry.createdAt;
  date.textContent = formatRelativeTime(new Date(entry.createdAt));
  header.appendChild(date);

  div.appendChild(header);

  const message = document.createElement('p');
  message.className = 'guestbook-message';
  message.textContent = entry.message;
  div.appendChild(message);

  return div;
}

/**
 * Format relative time
 */
function formatRelativeTime(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) {
    return date.toLocaleDateString();
  } else if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return 'just now';
  }
}

/**
 * Update relative time displays for all entries in the container
 */
function updateRelativeTimes(container: HTMLElement) {
  const timeElements = container.querySelectorAll<HTMLElement>('.guestbook-date');
  timeElements.forEach((timeEl) => {
    const dateTime = timeEl.getAttribute('datetime');
    if (dateTime) {
      const date = new Date(dateTime);
      timeEl.textContent = formatRelativeTime(date);
    }
  });
}
