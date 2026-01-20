class ThemeMetadata extends HTMLElement {
  private metadata: any = null;

  static get observedAttributes() {
    return ['metadata'];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === 'metadata' && oldValue !== newValue) {
      try {
        this.metadata = JSON.parse(newValue);
      } catch (e) {
        console.error('Failed to parse metadata attribute:', e);
        this.metadata = null;
      }
      this.render();
    }
  }

  connectedCallback() {
    this.render();
  }

  render() {
    if (!this.metadata) {
      this.innerHTML = '';
      return;
    }

    const { theme, metadata } = this.metadata;

    if (!theme || !metadata) {
      this.innerHTML = '';
      return;
    }

    this.innerHTML = `
      <div class="theme-metadata">
        <h3>Theme Generation Details</h3>
        <p>Your unique DID was used to generate the following theme:</p>
        <ul>
          <li><strong>Base Hue:</strong> ${metadata.hue}°</li>
          <li><strong>Background Color:</strong> <span style="background-color: ${theme.colors.background}; width: 1em; height: 1em; display: inline-block; border: 1px solid #ccc;"></span> ${theme.colors.background}</li>
          <li><strong>Text Color:</strong> <span style="background-color: ${theme.colors.text}; width: 1em; height: 1em; display: inline-block; border: 1px solid #ccc;"></span> ${theme.colors.text} (chosen for contrast)</li>
          <li><strong>Primary Color:</strong> <span style="background-color: ${theme.colors.primary}; width: 1em; height: 1em; display: inline-block; border: 1px solid #ccc;"></span> ${theme.colors.primary}</li>
          <li><strong>Accent Color:</strong> <span style="background-color: ${theme.colors.accent}; width: 1em; height: 1em; display: inline-block; border: 1px solid #ccc;"></span> ${theme.colors.accent}</li>
          <li><strong>Font Pairing:</strong> <span style="font-family: ${theme.fonts.heading};">${theme.fonts.heading}</span> / <span style="font-family: ${theme.fonts.body};">${theme.fonts.body}</span></li>
          <li><strong>Border:</strong> <div style="border: ${theme.borderWidth} ${theme.borderStyle} #000; width: 50px; height: 20px; display: inline-block; vertical-align: middle;"></div> ${theme.borderWidth} ${theme.borderStyle}</li>
        </ul>
      </div>
    `;
  }
}

customElements.define('theme-metadata', ThemeMetadata);