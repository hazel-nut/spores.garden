import { extractFields } from '../records/field-extractor';
import { createErrorMessage } from '../utils/loading-states';

/**
 * Smoke Signal Events Layout
 * 
 * Displays Smoke Signal events (hosting and attending).
 * Uses generic field extraction to work with various event record structures.
 */

/**
 * Render a smoke signal event record
 * 
 * @param fields - Extracted fields from the record
 * @param record - Optional original record reference (not used, but matches layout signature)
 */
export function renderSmokeSignal(fields: ReturnType<typeof extractFields>, record?: any): HTMLElement {
  const el = document.createElement('article');
  el.className = 'layout-smoke-signal';
  el.setAttribute('aria-label', 'Event');

  try {
    // Extract event fields using generic extractor
    const title = fields.title || 'Untitled Event';
    const content = fields.content || '';
    const date = fields.date;
    const url = fields.url;
    const image = fields.image;
    const $type = fields.$type || '';
    const $raw = fields.$raw || {};

  // Determine event type (hosting vs attending)
  // Look for common field names that might indicate event type
  const isHosting = 
    $raw.isHosting === true ||
    $raw.hosting === true ||
    $raw.role === 'host' ||
    $raw.eventType === 'hosting' ||
    $type.includes('host');

  const eventTypeLabel = isHosting ? 'Hosting' : 'Attending';
  const eventTypeClass = isHosting ? 'event-hosting' : 'event-attending';

  // Container
  const container = document.createElement('div');
  container.className = `smoke-signal-event ${eventTypeClass}`;

  // Event type badge
  const badge = document.createElement('div');
  badge.className = 'event-type-badge';
  badge.setAttribute('role', 'status');
  badge.setAttribute('aria-label', `Event type: ${eventTypeLabel.toLowerCase()}`);
  badge.textContent = eventTypeLabel;
  container.appendChild(badge);

    // Image (if available)
    if (image) {
      const imgContainer = document.createElement('div');
      imgContainer.className = 'event-image';
      imgContainer.style.position = 'relative';
      
      // Add loading spinner overlay
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'image-loading-overlay';
      loadingOverlay.style.position = 'absolute';
      loadingOverlay.style.top = '0';
      loadingOverlay.style.left = '0';
      loadingOverlay.style.right = '0';
      loadingOverlay.style.bottom = '0';
      loadingOverlay.style.display = 'flex';
      loadingOverlay.style.alignItems = 'center';
      loadingOverlay.style.justifyContent = 'center';
      loadingOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
      loadingOverlay.style.zIndex = '1';
      
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      spinner.style.width = '32px';
      spinner.style.height = '32px';
      loadingOverlay.appendChild(spinner);
      imgContainer.appendChild(loadingOverlay);
      
      const img = document.createElement('img');
      const imageUrl = typeof image === 'string' ? image : (image.url || image.href || '');
      img.src = imageUrl;
      img.alt = `${title} - Event image`;
      img.loading = 'lazy';
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.3s ease';
      
      img.addEventListener('load', () => {
        img.style.opacity = '1';
        loadingOverlay.style.display = 'none';
      });
      
      img.addEventListener('error', () => {
        loadingOverlay.style.display = 'none';
        img.style.display = 'none';
        const errorMsg = createErrorMessage(
          'Failed to load event image',
          () => {
            img.src = '';
            img.style.display = '';
            img.style.opacity = '0';
            loadingOverlay.style.display = 'flex';
            img.src = imageUrl;
            const existingError = imgContainer.querySelector('.error-state');
            if (existingError) {
              existingError.remove();
            }
          }
        );
        imgContainer.appendChild(errorMsg);
      });
      
      imgContainer.appendChild(img);
      container.appendChild(imgContainer);
    }

  // Content wrapper
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'event-content';

  // Title
  const titleEl = document.createElement('h2');
  titleEl.className = 'event-title';
  if (url) {
    const link = document.createElement('a');
    link.href = url;
    link.textContent = title;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `${title} - Opens in new tab`);
    titleEl.appendChild(link);
  } else {
    titleEl.textContent = title;
  }
  contentWrapper.appendChild(titleEl);

  // Date/time
  if (date) {
    const dateEl = document.createElement('time');
    dateEl.className = 'event-date';
    const dateObj = date instanceof Date ? date : new Date(date);
    if (!isNaN(dateObj.getTime())) {
      dateEl.dateTime = dateObj.toISOString();
      // Format date nicely
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      dateEl.textContent = formattedDate;
      dateEl.setAttribute('aria-label', `Event date: ${formattedDate}`);
      
      // Add relative time
      const relativeTime = getRelativeTime(dateObj);
      if (relativeTime) {
        const relativeEl = document.createElement('span');
        relativeEl.className = 'event-date-relative';
        relativeEl.setAttribute('aria-label', `Relative time: ${relativeTime}`);
        relativeEl.textContent = ` (${relativeTime})`;
        dateEl.appendChild(relativeEl);
      }
    } else {
      dateEl.textContent = String(date);
      dateEl.setAttribute('datetime', String(date));
    }
    contentWrapper.appendChild(dateEl);
  }

  // Location (look for location field in raw data)
  const location = $raw.location || $raw.venue || $raw.where || $raw.address;
  if (location) {
    const locationEl = document.createElement('div');
    locationEl.className = 'event-location';
    locationEl.setAttribute('aria-label', 'Event location');
    const locationText = typeof location === 'string' ? location : (location.name || location.address || JSON.stringify(location));
    locationEl.innerHTML = `<span aria-hidden="true">📍</span> <span>${locationText}</span>`;
    contentWrapper.appendChild(locationEl);
  }

  // Description/content
  if (content) {
    const descEl = document.createElement('div');
    descEl.className = 'event-description';
    descEl.setAttribute('role', 'article');
    // Handle markdown or plain text
    if (typeof content === 'string') {
      descEl.textContent = content;
    } else {
      descEl.textContent = String(content);
    }
    contentWrapper.appendChild(descEl);
  }

    container.appendChild(contentWrapper);
    el.appendChild(container);
  } catch (error) {
    console.error('Failed to render smoke signal event:', error);
    const errorEl = createErrorMessage(
      'Failed to render event',
      undefined,
      error instanceof Error ? error.message : String(error)
    );
    el.appendChild(errorEl);
  }

  return el;
}

/**
 * Get relative time string (e.g., "in 2 days", "3 hours ago")
 */
function getRelativeTime(date: Date): string | null {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (Math.abs(diffDay) > 7) {
    return null; // Don't show relative time for dates > 1 week away
  }

  if (Math.abs(diffSec) < 60) {
    return diffSec >= 0 ? 'soon' : 'just now';
  } else if (Math.abs(diffMin) < 60) {
    const value = Math.abs(diffMin);
    return diffMin >= 0 ? `in ${value} ${value === 1 ? 'minute' : 'minutes'}` : `${value} ${value === 1 ? 'minute' : 'minutes'} ago`;
  } else if (Math.abs(diffHour) < 24) {
    const value = Math.abs(diffHour);
    return diffHour >= 0 ? `in ${value} ${value === 1 ? 'hour' : 'hours'}` : `${value} ${value === 1 ? 'hour' : 'hours'} ago`;
  } else {
    const value = Math.abs(diffDay);
    return diffDay >= 0 ? `in ${value} ${value === 1 ? 'day' : 'days'}` : `${value} ${value === 1 ? 'day' : 'days'} ago`;
  }
}
