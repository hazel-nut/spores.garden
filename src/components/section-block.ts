/**
 * Section container component.
 * Renders sections based on type (records, content, profile, guestbook).
 * Provides edit controls for section management.
 */

import { getCollectionRecords, getRecordsByUris } from '../records/loader';
import { getSiteOwnerDid, getConfig, updateSection, removeSection, moveSectionUp, moveSectionDown } from '../config';
import { getProfile, getRecord } from '../at-client';
import { renderRecord, getAvailableLayouts } from '../layouts/index';
import '../layouts/guestbook'; // Register guestbook layout
import './create-profile'; // Register profile editor component

class SectionBlock extends HTMLElement {
  constructor() {
    super();
    this.section = null;
    this.editMode = false;
    this.renderToken = 0;
  }

  static get observedAttributes() {
    return ['data-section', 'data-edit-mode'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'data-section') {
      try {
        this.section = JSON.parse(newValue);
      } catch {
        this.section = null;
      }
    }
    if (name === 'data-edit-mode') {
      this.editMode = newValue === 'true';
    }
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  async render() {
    const token = ++this.renderToken;
    if (!this.section) {
      this.replaceChildren();
      this.innerHTML = '<div class="error">Invalid section</div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    // Check if this is a Bluesky post section (hide title in view mode)
    const isBlueskyPostSection = 
      this.section.collection === 'app.bsky.feed.post' ||
      (this.section.type === 'records' && this.section.records && 
       this.section.records.some(uri => uri.includes('app.bsky.feed.post')));
    
    // Section header (title + edit controls)
    // Hide title in view mode for Bluesky posts, but always show in edit mode
    const shouldShowTitle = this.section.title && (this.editMode || !isBlueskyPostSection);
    if (shouldShowTitle || this.editMode) {
      const header = document.createElement('div');
      header.className = 'section-header';

      if (shouldShowTitle) {
        const title = document.createElement('h2');
        title.className = 'section-title';
        title.textContent = this.section.title;
        header.appendChild(title);
      }

      if (this.editMode) {
        const controls = this.createEditControls();
        header.appendChild(controls);
        // Update info box asynchronously after controls are added
        const infoBox = controls.querySelector('.section-info');
        if (infoBox) {
          this.updateInfoBox(infoBox as HTMLElement);
        }
      }

      fragment.appendChild(header);
    }

    // Section content
    const content = document.createElement('div');
    content.className = 'section-content';

    try {
      switch (this.section.type) {
        case 'profile':
          await this.renderProfile(content);
          break;
        case 'records':
          await this.renderRecords(content);
          break;
        case 'content':
        case 'block': // Support legacy 'block' type
          await this.renderBlock(content);
          break;
        case 'guestbook':
          await this.renderGuestbook(content);
          break;
        default:
          content.innerHTML = `<p>Unknown section type: ${this.section.type}</p>`;
      }
    } catch (error) {
      console.error('Failed to render section:', error);
      content.innerHTML = `<p class="error">Failed to load section: ${error.message}</p>`;
    }

    if (token !== this.renderToken) {
      return;
    }

    this.className = 'section';
    this.setAttribute('data-type', this.section.type);
    fragment.appendChild(content);
    this.replaceChildren(fragment);
  }

  createEditControls() {
    const controls = document.createElement('div');
    controls.className = 'section-controls';

    // Info box showing element type
    const infoBox = document.createElement('div');
    infoBox.className = 'section-info';
    controls.appendChild(infoBox);

    // Move buttons container
    const moveButtons = document.createElement('div');
    moveButtons.className = 'section-move-buttons';
    moveButtons.style.display = 'flex';
    moveButtons.style.gap = '0.25rem';

    // Get current section index to determine if buttons should be disabled
    const config = getConfig();
    const sections = config.sections || [];
    const currentIndex = sections.findIndex(s => s.id === this.section.id);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === sections.length - 1;

    // Move up button
    const moveUpBtn = document.createElement('button');
    moveUpBtn.className = 'button button-secondary button-small';
    moveUpBtn.innerHTML = '↑';
    moveUpBtn.title = 'Move up';
    moveUpBtn.disabled = isFirst;
    moveUpBtn.addEventListener('click', () => {
      if (moveSectionUp(this.section.id)) {
        window.dispatchEvent(new CustomEvent('config-updated'));
      }
    });
    moveButtons.appendChild(moveUpBtn);

    // Move down button
    const moveDownBtn = document.createElement('button');
    moveDownBtn.className = 'button button-secondary button-small';
    moveDownBtn.innerHTML = '↓';
    moveDownBtn.title = 'Move down';
    moveDownBtn.disabled = isLast;
    moveDownBtn.addEventListener('click', () => {
      if (moveSectionDown(this.section.id)) {
        window.dispatchEvent(new CustomEvent('config-updated'));
      }
    });
    moveButtons.appendChild(moveDownBtn);

    controls.appendChild(moveButtons);

    // Edit button only for section types that support editing
    const supportsEditing = 
      this.section.type === 'content' || 
      this.section.type === 'block' || 
      this.section.type === 'profile';
    
    if (supportsEditing) {
      const editBtn = document.createElement('button');
      editBtn.className = 'button button-secondary button-small';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        if (this.section.type === 'content' || this.section.type === 'block') {
          this.editBlock();
        } else if (this.section.type === 'profile') {
          this.editProfile();
        }
      });
      controls.appendChild(editBtn);
    }

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'button button-danger button-small';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async () => {
      if (confirm('Delete this section?')) {
        // If this is a content/block with a PDS record, delete it
        if ((this.section.type === 'content' || this.section.type === 'block') && 
            this.section.collection === 'garden.spores.site.content' && 
            this.section.rkey) {
          try {
            const { deleteRecord } = await import('../oauth');
            await deleteRecord('garden.spores.site.content', this.section.rkey);
          } catch (error) {
            console.error('Failed to delete content record from PDS:', error);
            // Continue with section removal even if PDS delete fails
          }
        }
        removeSection(this.section.id);
        this.remove();
      }
    });
    controls.appendChild(deleteBtn);

    return controls;
  }

  async updateInfoBox(infoBox: HTMLElement) {
    let typeInfo = '';

    if (this.section.type === 'content' || this.section.type === 'block') {
      typeInfo = 'Content';
    } else if (this.section.type === 'records') {
      typeInfo = 'Loading...';
    } else {
      typeInfo = this.section.type.charAt(0).toUpperCase() + this.section.type.slice(1);
    }

    infoBox.textContent = typeInfo;

    // For records, fetch the actual $type asynchronously
    if (this.section.type === 'records' && this.section.records && this.section.records.length > 0) {
      try {
        const { getRecordByUri } = await import('../records/loader');
        const record = await getRecordByUri(this.section.records[0]);
        if (record && record.value && record.value.$type) {
          infoBox.textContent = record.value.$type;
        } else {
          infoBox.textContent = 'Record';
        }
      } catch (error) {
        console.error('Failed to load record type:', error);
        infoBox.textContent = 'Record';
      }
    }
  }

  async editBlock() {
    // Get or create the create-content modal
    let modal = document.querySelector('create-content') as any;
    if (!modal) {
      modal = document.createElement('create-content');
      document.body.appendChild(modal);
    }
    
    // Load existing block data
    const ownerDid = getSiteOwnerDid();
    if (this.section.collection === 'garden.spores.site.content' && this.section.rkey && ownerDid) {
      try {
        const record = await getRecord(ownerDid, this.section.collection, this.section.rkey);
        if (record && record.value) {
          modal.editContent({
            rkey: this.section.rkey,
            sectionId: this.section.id,
            title: record.value.title || this.section.title || '',
            content: record.value.content || '',
            format: record.value.format || this.section.format || 'markdown'
          });
        }
      } catch (error) {
        console.error('Failed to load content for editing:', error);
        alert('Failed to load content for editing');
        return;
      }
    } else {
      // Fallback for inline content
      modal.editContent({
        sectionId: this.section.id,
        title: this.section.title || '',
        content: this.section.content || '',
        format: this.section.format || 'text'
      });
    }
    
    modal.setOnClose(() => {
      this.render();
      window.dispatchEvent(new CustomEvent('config-updated'));
    });
    
    modal.show();
  }

  async editProfile() {
    // Get or create the create-profile modal
    let modal = document.querySelector('create-profile') as any;
    if (!modal) {
      modal = document.createElement('create-profile');
      document.body.appendChild(modal);
    }
    
    // Load existing profile data
    const ownerDid = getSiteOwnerDid();
    if (this.section.collection === 'garden.spores.site.profile' && this.section.rkey && ownerDid) {
      try {
        const record = await getRecord(ownerDid, this.section.collection, this.section.rkey);
        if (record && record.value) {
          modal.editProfile({
            rkey: this.section.rkey,
            sectionId: this.section.id,
            displayName: record.value.displayName || '',
            description: record.value.description || '',
            avatar: record.value.avatar || '',
            banner: record.value.banner || ''
          });
        } else {
          // No record found, create new one
          modal.editProfile({
            sectionId: this.section.id,
            displayName: '',
            description: '',
            avatar: '',
            banner: ''
          });
        }
      } catch (error) {
        console.error('Failed to load profile for editing:', error);
        // If record doesn't exist, allow creating new one
        modal.editProfile({
          sectionId: this.section.id,
          displayName: '',
          description: '',
          avatar: '',
          banner: ''
        });
      }
    } else {
      // No rkey - create new profile record
      modal.editProfile({
        sectionId: this.section.id,
        displayName: '',
        description: '',
        avatar: '',
        banner: ''
      });
    }
    
    modal.setOnClose(() => {
      this.render();
      window.dispatchEvent(new CustomEvent('config-updated'));
    });
    
    modal.show();
  }

  async renderProfile(container) {
    const ownerDid = getSiteOwnerDid();
    if (!ownerDid) {
      container.innerHTML = '<p>Login to create your garden</p>';
      return;
    }

    // Try to load from profile record first
    let profileData = null;
    if (this.section.collection === 'garden.spores.site.profile' && this.section.rkey) {
      try {
        const record = await getRecord(ownerDid, this.section.collection, this.section.rkey);
        if (record && record.value) {
          profileData = {
            displayName: record.value.displayName,
            description: record.value.description,
            avatar: record.value.avatar,
            banner: record.value.banner
          };
        }
      } catch (error) {
        console.warn('Failed to load profile record, falling back to Bluesky profile:', error);
      }
    }

    // Fall back to Bluesky profile if no record found
    if (!profileData) {
      const profile = await getProfile(ownerDid);
      if (!profile) {
        container.innerHTML = '<p>Could not load profile</p>';
        return;
      }
      profileData = {
        displayName: profile.displayName,
        description: profile.description,
        avatar: profile.avatar,
        banner: profile.banner
      };
    }

    // Convert profile to record format for layout
    const record = {
      value: {
        title: profileData.displayName,
        content: profileData.description,
        image: profileData.avatar
      }
    };

    const rendered = await renderRecord(record, this.section.layout || 'profile');
    container.appendChild(rendered);
  }

  async renderRecords(container) {
    const uris = this.section.records || [];

    if (uris.length === 0) {
      container.innerHTML = '<p class="empty">No records selected</p>';
      return;
    }

    const records = await getRecordsByUris(uris);

    if (records.length === 0) {
      container.innerHTML = '<p class="empty">Could not load selected records</p>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'record-grid';

    for (const record of records) {
      const rendered = await renderRecord(record, this.section.layout || 'card');
      grid.appendChild(rendered);
    }

    container.appendChild(grid);
  }

  async renderBlock(container) {
    const ownerDid = getSiteOwnerDid();
    let content = '';
    let format = 'text';
    let title = '';

    // If section references a content record, load it from PDS
    if (this.section.collection === 'garden.spores.site.content' && this.section.rkey && ownerDid) {
      try {
        const record = await getRecord(ownerDid, this.section.collection, this.section.rkey);
        if (record && record.value) {
          content = record.value.content || '';
          format = record.value.format || this.section.format || 'markdown';
          title = record.value.title || '';
        } else {
          container.innerHTML = '<p class="error">Content record not found</p>';
          return;
        }
      } catch (error) {
        console.error('Failed to load content record:', error);
        container.innerHTML = '<p class="error">Failed to load content</p>';
        return;
      }
    } else {
      // Fall back to inline content (for backwards compatibility)
      content = this.section.content || '';
      format = this.section.format || 'text';
      title = this.section.title || '';
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';

    if (format === 'html') {
      contentDiv.innerHTML = content;
    } else if (format === 'markdown') {
      // Basic markdown rendering
      contentDiv.innerHTML = this.renderMarkdown(content);
    } else {
      contentDiv.textContent = content;
    }

    container.appendChild(contentDiv);

    // In edit mode, make it editable (only for inline content, not records)
    if (this.editMode && !this.section.rkey) {
      contentDiv.contentEditable = true;
      contentDiv.addEventListener('blur', () => {
        updateSection(this.section.id, { content: contentDiv.innerText });
      });
    }
  }

  async renderGuestbook(container) {
    // Import and use the guestbook layout
    const { renderRecord } = await import('../layouts/index');
    const rendered = await renderRecord({}, 'guestbook');
    container.appendChild(rendered);
  }

  renderMarkdown(text) {
    return text
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\n/g, '<br>');
  }
}

customElements.define('section-block', SectionBlock);
