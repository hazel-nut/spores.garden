/**
 * <welcome> - Welcome modal shown after first login
 *
 * Provides action choices for users to build their site:
 * - Load records from their PDS
 * - Create content block
 * - Load predefined templates
 * - Select Bluesky posts to showcase
 */

import { getCollections, getAllRecords, groupByCollection } from '../records/loader';
import { getCurrentDid, getAgent } from '../oauth';
import { addSection, getConfig } from '../config';
import { getProfile } from '../at-client';
import type { ATRecord } from '../types';

type WelcomeAction =
  | 'load-records'
  | 'create-content'
  | 'select-bsky-posts'
  | 'skip';

class WelcomeModal extends HTMLElement {
  private did: string | null = null;
  private onClose: (() => void) | null = null;
  private collections: string[] = [];

  connectedCallback() {
    this.did = getCurrentDid();
    this.render();
  }

  // Method to trigger an action directly (used when called from edit mode)
  triggerAction(action: WelcomeAction) {
    if (!this.did) {
      this.did = getCurrentDid();
    }
    
    // Ensure component is rendered
    if (!this.querySelector('.welcome-content')) {
      this.render();
    }
    
    // Wait for render to complete, then trigger action
    setTimeout(() => {
      switch (action) {
        case 'load-records':
          this.handleLoadRecords();
          break;
        case 'select-bsky-posts':
          this.handleSelectBskyPosts();
          break;
        case 'create-content':
          this.handleCreateContent();
          break;
      }
    }, 0);
  }

  setOnClose(callback: () => void) {
    this.onClose = callback;
  }

  private async render() {
    this.className = 'welcome-modal';
    this.innerHTML = '';

    const modal = document.createElement('div');
    modal.className = 'welcome-content';

    // Header
    const header = document.createElement('div');
    header.className = 'welcome-header';

    const title = document.createElement('h1');
    title.className = 'welcome-title';
    title.textContent = 'Welcome to spores.garden';
    header.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'welcome-subtitle';
    subtitle.textContent = 'Choose how you\'d like to start building your site';
    header.appendChild(subtitle);

    modal.appendChild(header);

    // Actions grid
    const actions = document.createElement('div');
    actions.className = 'welcome-actions';

    // Create Content Block
    const createBlock = this.createActionCard({
      icon: '📝',
      title: 'Create Content Block',
      description: 'Add a new custom content section to your site',
      action: () => this.handleCreateContent()
    });
    actions.appendChild(createBlock);

    // Select Bluesky Posts
    const selectPosts = this.createActionCard({
      icon: '🐘',
      title: 'Showcase Bluesky Posts',
      description: 'Choose your favorite posts to display on your site',
      action: () => this.handleSelectBskyPosts()
    });
    actions.appendChild(selectPosts);

    // Explore your data
    const loadRecords = this.createActionCard({
      icon: '📚',
      title: 'Explore your data',
      description: 'Browse and select records from your AT Protocol repository',
      action: () => this.handleLoadRecords()
    });
    actions.appendChild(loadRecords);

    modal.appendChild(actions);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'welcome-footer';

    const skipBtn = document.createElement('button');
    skipBtn.className = 'button button-ghost';
    skipBtn.textContent = 'Skip for now';
    skipBtn.addEventListener('click', () => this.close());
    footer.appendChild(skipBtn);

    modal.appendChild(footer);

    this.appendChild(modal);

    // Handle backdrop click
    this.addEventListener('click', (e) => {
      if (e.target === this) {
        this.close();
      }
    });
  }

  private createActionCard(options: {
    icon: string;
    title: string;
    description: string;
    action: () => void;
  }) {
    const card = document.createElement('button');
    card.className = 'welcome-action-card';
    card.type = 'button';

    const icon = document.createElement('div');
    icon.className = 'welcome-icon';
    icon.textContent = options.icon;
    card.appendChild(icon);

    const content = document.createElement('div');
    content.className = 'welcome-card-content';

    const title = document.createElement('h3');
    title.textContent = options.title;
    content.appendChild(title);

    const description = document.createElement('p');
    description.textContent = options.description;
    content.appendChild(description);

    card.appendChild(content);
    card.addEventListener('click', options.action);

    return card;
  }

  async handleLoadRecords() {
    if (!this.did) {
      this.showMessage('No DID found. Please log in again.');
      return;
    }

    this.showLoading('Loading your records...');

    try {
      this.collections = await getCollections(this.did);
      
      if (this.collections.length === 0) {
        this.showMessage('No collections found in your repository.');
        return;
      }

      this.showCollectionSelector(this.collections);
    } catch (error) {
      console.error('Failed to load collections:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.showMessage(`Failed to load records: ${errorMessage}. Please check your connection and try again.`);
    }
  }

  async handleSelectBskyPosts() {
    if (!this.did) {
      this.showMessage('No DID found. Please log in again.');
      return;
    }

    this.showLoading('Loading your Bluesky posts...');

    try {
      // Use the same method that works in "Explore your data"
      const { getCollectionRecords } = await import('../records/loader');
      const posts = await getCollectionRecords(this.did, 'app.bsky.feed.post', { limit: 50 });

      if (posts.length === 0) {
        this.showMessage('No posts found in your Bluesky feed.');
        return;
      }

      this.showPostSelector(posts);
    } catch (error) {
      console.error('Failed to load posts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.showMessage(`Failed to load Bluesky posts: ${errorMessage}. Please try again.`);
    }
  }

  private handleCreateContent() {
    this.close(() => {
      // Dispatch event to trigger add section modal
      window.dispatchEvent(new CustomEvent('add-section', {
        detail: { type: 'content' }
      }));
    });
  }


  private showLoading(message: string) {
    this.innerHTML = `
      <div class="welcome-content">
        <div class="welcome-loading">
          <div class="spinner"></div>
          <p>${message}</p>
        </div>
      </div>
    `;
  }

  private showMessage(message: string) {
    const content = this.querySelector('.welcome-content');
    if (!content) return;

    content.innerHTML = `
      <div class="welcome-message">
        <p>${message}</p>
        <button class="button" data-action="back-main">Back</button>
      </div>
    `;

    content.querySelector('[data-action="back-main"]')?.addEventListener('click', () => {
      this.render();
    });
  }

  private showCollectionSelector(collections: string[]) {
    const content = this.querySelector('.welcome-content');
    if (!content) return;

    content.innerHTML = `
      <div class="welcome-selector">
        <h2>Select Collection</h2>
        <p>Choose a collection to load records from</p>
        <div class="collection-list">
          ${collections.map(coll => `
            <button class="collection-item" data-collection="${coll}">
              <span class="collection-name">${coll}</span>
              <span class="collection-arrow">→</span>
            </button>
          `).join('')}
        </div>
        <button class="button button-secondary" data-action="back-main">Back</button>
      </div>
    `;

    // Attach back button listener
    content.querySelector('[data-action="back-main"]')?.addEventListener('click', () => {
      this.render();
    });

    content.querySelectorAll('.collection-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        const collection = btn.getAttribute('data-collection');
        if (!collection || !this.did) return;

        this.showLoading(`Loading records from ${collection}...`);

        try {
          const { getCollectionRecords } = await import('../records/loader');
          const records = await getCollectionRecords(this.did, collection, { limit: 20 });

          if (records.length === 0) {
            this.showMessage(`No records found in ${collection}.`);
            return;
          }

          this.showRecordSelector(collection, records);
        } catch (error) {
          console.error('Failed to load records:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.showMessage(`Failed to load records from ${collection}: ${errorMessage}. Please try again.`);
        }
      });
    });
  }

  private showRecordSelector(collection: string, records: ATRecord[]) {
    const content = this.querySelector('.welcome-content');
    if (!content) return;

    content.innerHTML = `
      <div class="welcome-selector">
        <h2>Select Records to Add</h2>
        <p>Choose records from ${collection} to add to your site</p>
        <div class="record-list">
          ${records.map((record, idx) => {
            const rkey = record.uri?.split('/').pop() || idx.toString();
            const title = record.value?.text?.slice(0, 50) || 
                         record.value?.title || 
                         record.value?.name ||
                         rkey;
            return `
              <label class="record-item">
                <input type="checkbox" value="${rkey}" data-uri="${record.uri || ''}">
                <span class="record-title">${title}</span>
              </label>
            `;
          }).join('')}
        </div>
        <div class="selector-actions">
          <button class="button" data-action="add-records" data-collection="${collection}">Add Selected</button>
          <button class="button button-secondary" data-action="back-collections">Back</button>
        </div>
      </div>
    `;

    // Attach event listeners
    content.querySelector('[data-action="add-records"]')?.addEventListener('click', () => {
      const collection = content.querySelector('[data-action="add-records"]')?.getAttribute('data-collection');
      if (collection) {
        this.addSelectedRecords(collection);
      }
    });

    content.querySelector('[data-action="back-collections"]')?.addEventListener('click', () => {
      this.showCollectionSelector(this.collections);
    });
  }

  private async addSelectedRecords(collection: string) {
    const selected = Array.from(this.querySelectorAll<HTMLInputElement>('.record-item input:checked'));
    
    if (selected.length === 0) {
      alert('Please select at least one record.');
      return;
    }

    // Add sections for selected records
    // Use 'records' type to show only the specific selected records, not all records from the collection
    for (const input of selected) {
      const uri = input.getAttribute('data-uri');
      if (!uri) continue;

      addSection({
        type: 'records',
        records: [uri],
        layout: 'card'
      });
    }

    this.close(() => {
      window.dispatchEvent(new CustomEvent('config-updated'));
    });
  }

  private showPostSelector(posts: ATRecord[]) {
    const content = this.querySelector('.welcome-content');
    if (!content) return;

    content.innerHTML = `
      <div class="welcome-selector">
        <h2>Select Bluesky Post</h2>
        <p>Choose a post to add to your garden</p>
        <div class="post-list">
          ${posts.map((post, idx) => {
            const rkey = post.uri?.split('/').pop() || idx.toString();
            const uri = post.uri || '';
            const text = post.value?.text?.slice(0, 200) || 'Post';
            const createdAt = post.value?.createdAt 
              ? new Date(post.value.createdAt).toLocaleDateString()
              : '';
            return `
              <button class="post-item-selectable" data-uri="${uri}" data-rkey="${rkey}">
                <div class="post-content">
                  <p class="post-text">${this.escapeHtml(text)}${text.length >= 200 ? '...' : ''}</p>
                  ${createdAt ? `<time class="post-date">${createdAt}</time>` : ''}
                </div>
              </button>
            `;
          }).join('')}
        </div>
        <div class="selector-actions">
          <button class="button button-secondary" data-action="back-main">Back</button>
        </div>
      </div>
    `;

    // Attach event listeners - clicking a post adds it
    content.querySelectorAll('.post-item-selectable').forEach(btn => {
      btn.addEventListener('click', () => {
        const uri = btn.getAttribute('data-uri');
        if (uri) {
          this.addSinglePost(uri);
        }
      });
    });

    content.querySelector('[data-action="back-main"]')?.addEventListener('click', () => {
      this.render();
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private async addSelectedPosts() {
    const selected = Array.from(this.querySelectorAll<HTMLInputElement>('.post-item input:checked'));
    
    if (selected.length === 0) {
      alert('Please select at least one post.');
      return;
    }

    // Group selected posts into a single collection section
    const uris = selected.map(input => input.getAttribute('data-uri')).filter(Boolean);

    addSection({
      type: 'collection',
      collection: 'app.bsky.feed.post',
      records: uris,
      layout: 'post',
      title: 'My Bluesky Posts'
    });

    this.close(() => {
      window.dispatchEvent(new CustomEvent('config-updated'));
    });
  }

  private addSinglePost(uri: string) {
    // Add a single post as a records section
    addSection({
      type: 'records',
      records: [uri],
      layout: 'post'
    });

    this.close(() => {
      window.dispatchEvent(new CustomEvent('config-updated'));
    });
  }


  private close(callback?: () => void) {
    if (callback) {
      callback();
    }
    if (this.onClose) {
      this.onClose();
    }
    this.remove();
  }
}

customElements.define('welcome-modal', WelcomeModal);
