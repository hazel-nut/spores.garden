import { updateConfig } from "../config";

class DidVisualization extends HTMLElement {
  private did: string | null = null;

  static get observedAttributes() {
    return ['did'];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === 'did' && oldValue !== newValue) {
      this.did = newValue;
      this.render();
    }
  }

  connectedCallback() {
    this.render();
  }

  render() {
    if (!this.did) {
      this.innerHTML = '<p>No DID provided</p>';
      return;
    }

    // SVG visualization
    const hash = this.stringToHash(this.did);
    const svgSize = 100;
    const gridSize = 10;
    const cell_size = svgSize / gridSize;

    let rects = '';
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const charCode = this.did.charCodeAt((i * gridSize + j) % this.did.length);
        const color = `hsl(${(hash + charCode * (i * gridSize + j)) % 360}, 70%, 80%)`;
        rects += `<rect x="${j * cell_size}" y="${i * cell_size}" width="${cell_size}" height="${cell_size}" fill="${color}" />`;
      }
    }

    const svgString = `<svg width="100" height="100" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;

    this.innerHTML = `
      <div style="display: flex; justify-content: center;">
        ${svgString}
      </div>
    `;

    this.updateFavicon(svgString);
    updateConfig({ favicon: svgString });
  }

  private updateFavicon(svgString: string) {
    const dataUri = `data:image/svg+xml;base64,${btoa(svgString)}`;
    
    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (link) {
      link.href = dataUri;
    } else {
      link = document.createElement('link');
      link.rel = 'icon';
      link.href = dataUri;
      document.head.appendChild(link);
    }
  }

  private stringToHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

customElements.define('did-visualization', DidVisualization);