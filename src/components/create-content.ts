/**
 * Modal for creating and editing content blocks.
 * Supports markdown, HTML, and plain text formats.
 */

import { createRecord, putRecord } from '../oauth';
import { addSection, updateSection, getSiteOwnerDid } from '../config';
import { getRecord } from '../at-client';

class CreateContent extends HTMLElement {
  private onClose: (() => void) | null = null;
  private selectedFormat: string = 'markdown';
  private contentTitle: string = '';
  private contentContent: string = '';
  private editMode: boolean = false;
  private editRkey: string | null = null;
  private editSectionId: string | null = null;

  connectedCallback() {
    this.render();
  }

  setOnClose(callback: () => void) {
    this.onClose = callback;
  }

  show() {
    this.style.display = 'flex';
    this.render();
  }

  editContent(contentData: {
    rkey?: string;
    sectionId?: string;
    title: string;
    content: string;
    format: string;
  }) {
    this.editMode = true;
    this.editRkey = contentData.rkey || null;
    this.editSectionId = contentData.sectionId || null;
    this.contentTitle = contentData.title || '';
    this.contentContent = contentData.content || '';
    this.selectedFormat = contentData.format || 'markdown';
    this.show();
  }

  hide() {
    this.style.display = 'none';
  }

  private render() {
    this.className = 'modal';
    this.style.display = 'flex';
    this.innerHTML = `
      <div class="modal-content create-content-modal">
        <h2>${this.editMode ? 'Edit Content' : 'Create Content'}</h2>
        
        <div class="form-group">
          <label for="content-format">Content Type</label>
          <select id="content-format" class="select">
            <option value="markdown" ${this.selectedFormat === 'markdown' ? 'selected' : ''}>Markdown</option>
            <option value="html" ${this.selectedFormat === 'html' ? 'selected' : ''}>HTML</option>
            <option value="text" ${this.selectedFormat === 'text' ? 'selected' : ''}>Plain Text</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="content-title">Title (optional)</label>
          <input type="text" id="content-title" class="input" placeholder="Content title" maxlength="200" value="${(this.contentTitle || '').replace(/"/g, '&quot;')}">
        </div>
        
        <div class="form-group">
          <label for="content-content">Content</label>
          <textarea id="content-content" class="textarea" rows="10" placeholder="Enter your content here..." required>${(this.contentContent || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
        </div>
        
        <div class="form-group">
          <label for="content-upload" class="upload-label">
            <span>📎 Upload File</span>
            <input type="file" id="content-upload" class="file-input" accept=".txt,.md,.html">
            <span class="upload-hint">Or upload a text, markdown, or HTML file</span>
          </label>
        </div>
        
        <div class="modal-actions">
          <button class="button button-primary" id="create-content-btn">${this.editMode ? 'Save Changes' : 'Create Content'}</button>
          <button class="button button-secondary modal-close">Cancel</button>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners() {
    const formatSelect = this.querySelector('#content-format') as HTMLSelectElement;
    const titleInput = this.querySelector('#content-title') as HTMLInputElement;
    const contentTextarea = this.querySelector('#content-content') as HTMLTextAreaElement;
    const fileInput = this.querySelector('#content-upload') as HTMLInputElement;
    const createBtn = this.querySelector('#create-content-btn') as HTMLButtonElement;
    const cancelBtn = this.querySelector('.modal-close') as HTMLButtonElement;
    
    // Handle format change
    formatSelect?.addEventListener('change', (e) => {
      this.selectedFormat = (e.target as HTMLSelectElement).value;
    });
    
    // Handle title input
    titleInput?.addEventListener('input', (e) => {
      this.contentTitle = (e.target as HTMLInputElement).value.trim();
    });
    
    // Handle content input
    contentTextarea?.addEventListener('input', (e) => {
      this.contentContent = (e.target as HTMLTextAreaElement).value;
    });
    
    // Handle file upload
    fileInput?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        this.contentContent = text;
        if (contentTextarea) {
          contentTextarea.value = text;
        }
        
        // Auto-detect format from file extension
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'md') {
          this.selectedFormat = 'markdown';
          if (formatSelect) formatSelect.value = 'markdown';
        } else if (ext === 'html' || ext === 'htm') {
          this.selectedFormat = 'html';
          if (formatSelect) formatSelect.value = 'html';
        } else {
          this.selectedFormat = 'text';
          if (formatSelect) formatSelect.value = 'text';
        }
      } catch (error) {
        console.error('Failed to read file:', error);
        alert('Failed to read file. Please try again.');
      }
    });
    
    // Handle create/save button
    createBtn?.addEventListener('click', async () => {
      if (!this.contentContent.trim()) {
        alert('Please enter some content.');
        return;
      }
      
      if (createBtn) {
        createBtn.disabled = true;
        createBtn.textContent = this.editMode ? 'Saving...' : 'Creating...';
      }
      
      try {
        if (this.editMode) {
          await this.updateContentRecord({
            title: this.contentTitle || undefined,
            content: this.contentContent,
            format: this.selectedFormat
          });
        } else {
          await this.createContentRecord({
            title: this.contentTitle || undefined,
            content: this.contentContent,
            format: this.selectedFormat
          });
        }
        
        this.close();
      } catch (error) {
        console.error(`Failed to ${this.editMode ? 'update' : 'create'} content:`, error);
        alert(`Failed to ${this.editMode ? 'update' : 'create'} content: ${error instanceof Error ? error.message : 'Unknown error'}`);
        if (createBtn) {
          createBtn.disabled = false;
          createBtn.textContent = this.editMode ? 'Save Changes' : 'Create Content';
        }
      }
    });
    
    // Handle cancel button
    cancelBtn?.addEventListener('click', () => this.close());
    
    // Handle backdrop click
    this.addEventListener('click', (e) => {
      if (e.target === this) {
        this.close();
      }
    });
  }

  private async createContentRecord(contentData: {
    title?: string;
    content: string;
    format: string;
  }) {
    // Create the content record
    const record: any = {
      $type: 'garden.spores.site.content',
      content: contentData.content,
      format: contentData.format || 'markdown',
      createdAt: new Date().toISOString()
    };
    
    if (contentData.title) {
      record.title = contentData.title;
    }
    
    const response = await createRecord('garden.spores.site.content', record);
    
    // Extract rkey from the response URI
    const rkey = response.uri.split('/').pop();
    
    // Add section to config referencing this content
    const section: any = {
      type: 'content',
      collection: 'garden.spores.site.content',
      rkey: rkey,
      format: contentData.format
    };
    
    // Only add title if provided
    if (contentData.title) {
      section.title = contentData.title;
    }
    
    addSection(section);
    
    // Trigger re-render
    window.dispatchEvent(new CustomEvent('config-updated'));
  }

  private async updateContentRecord(contentData: {
    title?: string;
    content: string;
    format: string;
  }) {
    const ownerDid = getSiteOwnerDid();
    if (!ownerDid) {
      throw new Error('Not logged in');
    }

    if (this.editRkey) {
      // Update existing content record
      const record: any = {
        $type: 'garden.spores.site.content',
        content: contentData.content,
        format: contentData.format || 'markdown',
        createdAt: new Date().toISOString()
      };
      
      if (contentData.title) {
        record.title = contentData.title;
      }
      
      await putRecord('garden.spores.site.content', this.editRkey, record);
      
      // Update section config if title changed
      if (this.editSectionId) {
        const updates: any = { format: contentData.format };
        if (contentData.title) {
          updates.title = contentData.title;
        }
        updateSection(this.editSectionId, updates);
      }
    } else if (this.editSectionId) {
      // Update inline content section
      const updates: any = {
        content: contentData.content,
        format: contentData.format
      };
      if (contentData.title) {
        updates.title = contentData.title;
      }
      updateSection(this.editSectionId, updates);
    }
    
    // Trigger re-render
    window.dispatchEvent(new CustomEvent('config-updated'));
  }

  private close() {
    this.hide();
    if (this.onClose) {
      this.onClose();
    }
    // Reset form state
    this.editMode = false;
    this.editRkey = null;
    this.editSectionId = null;
    this.selectedFormat = 'markdown';
    this.contentTitle = '';
    this.contentContent = '';
  }
}

customElements.define('create-content', CreateContent);
