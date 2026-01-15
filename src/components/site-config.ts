/**
 * <site-config> - Garden configuration editor
 *
 * Displays a form for editing garden-level configuration:
 * - Title (h1)
 * - Subtitle (h2)
 * - Theme preset
 * - Theme colors
 * - Custom CSS
 */

import { getConfig, updateConfig, updateTheme, setCustomCss } from '../config';
import { getThemePresets, getThemePreset, getPresetColors } from '../themes/engine';
import { applyTheme } from '../themes/engine';

class SiteConfig extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const config = getConfig();
    const theme = config.theme || { preset: 'minimal' };
    const presets = getThemePresets();
    
    // Get preset defaults for the current preset
    const presetTheme = getThemePreset(theme.preset) || getThemePreset('minimal');
    const presetColors = presetTheme?.colors || {};
    
    // Helper to get effective color value (custom override or preset default)
    // This is what the color picker should show
    const getEffectiveColor = (colorName: string) => {
      return theme.colors?.[colorName] || presetColors[colorName] || '#000000';
    };
    
    // Helper to get display value for text input (empty if using preset default)
    const getDisplayColor = (colorName: string) => {
      return theme.colors?.[colorName] || '';
    };

    this.innerHTML = `
      <div class="site-config">
        <div class="site-config-header">
          <h3>Garden Configuration</h3>
        </div>
        <div class="site-config-content">
          <div class="site-config-section">
            <label class="label">Title (H1)</label>
            <input 
              type="text" 
              class="input" 
              id="config-title" 
              value="${(config.title || '').replace(/"/g, '&quot;')}" 
              placeholder="Site title"
              maxlength="100"
            />
          </div>

          <div class="site-config-section">
            <label class="label">Subtitle (H2)</label>
            <input 
              type="text" 
              class="input" 
              id="config-subtitle" 
              value="${((config.subtitle || '').replace(/"/g, '&quot;'))}" 
              placeholder="Site subtitle"
              maxlength="200"
            />
          </div>

          <div class="site-config-section">
            <label class="label">Theme Preset</label>
            <select class="input select" id="config-theme-preset">
              ${presets.map(preset => `
                <option value="${preset}" ${theme.preset === preset ? 'selected' : ''}>${preset.charAt(0).toUpperCase() + preset.slice(1)}</option>
              `).join('')}
            </select>
          </div>

          <div class="site-config-section">
            <label class="label">Theme Colors</label>
            <div class="theme-colors">
              <div class="theme-color-group">
                <label class="label-small">Background</label>
                <input 
                  type="color" 
                  class="color-input" 
                  id="config-color-background" 
                  value="${getEffectiveColor('background')}"
                />
                <input 
                  type="text" 
                  class="input input-small" 
                  id="config-color-background-text" 
                  value="${getDisplayColor('background')}" 
                  placeholder="${presetColors.background || '#ffffff'}"
                />
              </div>
              <div class="theme-color-group">
                <label class="label-small">Text</label>
                <input 
                  type="color" 
                  class="color-input" 
                  id="config-color-text" 
                  value="${getEffectiveColor('text')}"
                />
                <input 
                  type="text" 
                  class="input input-small" 
                  id="config-color-text-text" 
                  value="${getDisplayColor('text')}" 
                  placeholder="${presetColors.text || '#000000'}"
                />
              </div>
              <div class="theme-color-group">
                <label class="label-small">Primary</label>
                <input 
                  type="color" 
                  class="color-input" 
                  id="config-color-primary" 
                  value="${getEffectiveColor('primary')}"
                />
                <input 
                  type="text" 
                  class="input input-small" 
                  id="config-color-primary-text" 
                  value="${getDisplayColor('primary')}" 
                  placeholder="${presetColors.primary || '#0066cc'}"
                />
              </div>
              <div class="theme-color-group">
                <label class="label-small">Accent</label>
                <input 
                  type="color" 
                  class="color-input" 
                  id="config-color-accent" 
                  value="${getEffectiveColor('accent')}"
                />
                <input 
                  type="text" 
                  class="input input-small" 
                  id="config-color-accent-text" 
                  value="${getDisplayColor('accent')}" 
                  placeholder="${presetColors.accent || '#0066cc'}"
                />
              </div>
            </div>
          </div>

          <div class="site-config-section">
            <label class="label">Custom CSS</label>
            <textarea 
              class="input textarea" 
              id="config-custom-css" 
              placeholder="/* Custom CSS styles */"
              rows="6"
            >${(config.customCss || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const config = getConfig();
    const theme = config.theme || { preset: 'minimal', colors: {} };

    // Title - update config and header directly without full re-render
    const titleInput = this.querySelector('#config-title');
    titleInput.addEventListener('input', (e) => {
      const value = e.target.value;
      updateConfig({ title: value });
      // Update header directly to avoid full re-render
      const titleEl = document.querySelector('.site-title');
      if (titleEl) {
        titleEl.textContent = value || 'spores.garden';
      }
    });

    // Subtitle - update config and header directly without full re-render
    const subtitleInput = this.querySelector('#config-subtitle');
    subtitleInput.addEventListener('input', (e) => {
      const value = e.target.value;
      updateConfig({ subtitle: value });
      // Update header directly to avoid full re-render
      const subtitleEl = document.querySelector('.site-subtitle');
      if (subtitleEl) {
        subtitleEl.textContent = value || 'A personal ATProto website';
      }
    });

    // Theme preset - frontend-only, just updates color pickers
    const presetSelect = this.querySelector('#config-theme-preset');
    presetSelect.addEventListener('change', (e) => {
      const newPreset = (e.target as HTMLSelectElement).value;
      
      // Get preset colors and update color pickers
      const presetColors = getPresetColors(newPreset) || getPresetColors('minimal') || {};
      
      // Update all color picker and text input elements with preset colors
      const colorFields = ['background', 'text', 'primary', 'accent'];
      colorFields.forEach(colorName => {
        const colorInput = this.querySelector(`#config-color-${colorName}`) as HTMLInputElement;
        const textInput = this.querySelector(`#config-color-${colorName}-text`) as HTMLInputElement;
        
        if (colorInput && textInput && presetColors[colorName]) {
          // Update color picker to show preset color
          colorInput.value = presetColors[colorName];
          // Update text input to show the color value
          textInput.value = presetColors[colorName];
          // Write color to config (these are the values that will be saved to PDS)
          this.updateThemeColor(colorName, presetColors[colorName]);
        }
      });
      
      // Update frontend-only preset
      updateTheme({ preset: newPreset });
      this.applyThemePreview();
      this.dispatchUpdate();
    });

    // Color inputs - sync color picker and text input
    const colorFields = ['background', 'text', 'primary', 'accent'];
    const presetTheme = getThemePreset(theme.preset) || getThemePreset('minimal');
    const presetColors = presetTheme?.colors || {};
    
    colorFields.forEach(colorName => {
      const colorInput = this.querySelector(`#config-color-${colorName}`) as HTMLInputElement;
      const textInput = this.querySelector(`#config-color-${colorName}-text`) as HTMLInputElement;

      // Color picker -> text input
      colorInput.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        textInput.value = value;
        this.updateThemeColor(colorName, value);
      });

      // Text input -> color picker (with validation)
      textInput.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value.trim();
        if (value === '') {
          // If cleared, reset to preset default and remove override
          const presetDefault = presetColors[colorName] || '#000000';
          colorInput.value = presetDefault;
          this.updateThemeColor(colorName, '');
        } else if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
          colorInput.value = value;
          this.updateThemeColor(colorName, value);
        }
      });
    });

    // Custom CSS
    const cssTextarea = this.querySelector('#config-custom-css');
    cssTextarea.addEventListener('input', (e) => {
      setCustomCss(e.target.value);
      this.applyThemePreview();
      this.dispatchUpdate();
    });
  }

  updateThemeColor(colorName, value) {
    const config = getConfig();
    const currentTheme = config.theme || { preset: 'minimal', colors: {} };
    const newColors = {
      ...currentTheme.colors
    };
    
    // Only set the color if it has a value, otherwise remove it
    if (value && value.trim() !== '') {
      newColors[colorName] = value;
    } else {
      // Remove the color override if cleared (will use preset default)
      delete newColors[colorName];
    }

    updateTheme({ colors: newColors });
    this.applyThemePreview();
    this.dispatchUpdate();
  }

  applyThemePreview() {
    const config = getConfig();
    applyTheme(config.theme, config.customCss);
  }

  dispatchUpdate() {
    // Dispatch event to notify parent components
    window.dispatchEvent(new CustomEvent('config-updated'));
  }
}

customElements.define('site-config', SiteConfig);
