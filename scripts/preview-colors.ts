/**
 * Color Variation Preview
 *
 * Generates an HTML file showing color palettes for different DIDs.
 * Compare old (pre-refactor), refactor (55f1484), and current (middle-ground) styles.
 *
 * Usage: npx tsx scripts/preview-colors.ts
 * Output: color-preview.html (open in browser)
 */

import { writeFileSync } from 'fs';
import chroma from 'chroma-js';
import { generateColorsFromDid } from '../src/themes/colors';
import { generateFlowerSVGString } from '../src/utils/flower-svg';

const TEST_DIDS = [
  'did:plc:abc123xyz',
  'did:plc:flower-grid-0-42-1738000000',
  'did:plc:hypha-coop',
  'did:plc:test-garden-001',
  'did:plc:very-long-did-string-for-variation-testing',
  'did:plc:xyz789',
  'did:plc:garden-blue',
  'did:plc:garden-warm',
];

function stringToHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Old (pre-55f1484): light pastel bg, palette-based primary/accent */
function generateColorsOld(did: string): Record<string, string> {
  const hash = stringToHash(did);
  const hue = hash % 360;
  const backgroundColor = chroma.hsl(hue, 0.8, 0.9);
  const textColor = chroma.contrast(backgroundColor, 'white') > 4.5 ? 'white' : 'black';
  const palette = chroma.scale([backgroundColor, textColor]).mode('lch').colors(5);
  return {
    background: backgroundColor.hex(),
    text: textColor,
    primary: chroma(palette[2]).saturate(2).hex(),
    accent: chroma(palette[3]).saturate(2).hex(),
  };
}

/** Refactor (55f1484): vibrant bg, high-sat primary/accent */
function generateColorsRefactor(did: string): Record<string, string> {
  const hash = stringToHash(did);
  const hue = hash % 360;
  const saturation = 0.85 + ((hash >> 8) % 16) / 100;
  const lightness = 0.4 + ((hash >> 12) % 30) / 100;
  const backgroundColor = chroma.hsl(hue, saturation, lightness);
  const whiteContrast = chroma.contrast(backgroundColor, 'white');
  const blackContrast = chroma.contrast(backgroundColor, 'black');
  const textColor = (whiteContrast > blackContrast && whiteContrast > 4.5) ? 'white' : 'black';
  const isDarkBackground = whiteContrast > blackContrast;
  const primarySaturation = 0.9 + ((hash >> 4) % 11) / 100;
  const primaryLightness = isDarkBackground ? 0.6 + ((hash >> 16) % 20) / 100 : 0.3 + ((hash >> 16) % 20) / 100;
  const primaryColor = chroma.hsl(hue, primarySaturation, primaryLightness);
  const accentHue = (hue + 60 + ((hash >> 20) % 120)) % 360;
  const accentSaturation = 0.9 + ((hash >> 5) % 11) / 100;
  const accentLightness = isDarkBackground ? 0.6 + ((hash >> 17) % 20) / 100 : 0.3 + ((hash >> 17) % 20) / 100;
  const accentColor = chroma.hsl(accentHue, accentSaturation, accentLightness);
  return {
    background: backgroundColor.hex(),
    text: textColor,
    primary: primaryColor.hex(),
    accent: accentColor.hex(),
  };
}

function buildPaletteHTML(
  did: string,
  colors: Record<string, string>,
  label: string,
  showFlower: boolean
): string {
  const flowerSVG = showFlower ? generateFlowerSVGString(did, 80) : '';

  return `
    <div class="palette">
      <div class="palette-header">
        <span class="palette-label">${label}</span>
        <code class="palette-did">${did.length > 35 ? did.slice(0, 20) + '…' + did.slice(-12) : did}</code>
      </div>
      <div class="palette-bg" style="background: ${colors.background}; color: ${colors.text};">
        <div class="swatches">
          <div class="swatch" style="background: ${colors.background};" title="background">bg</div>
          <div class="swatch" style="background: ${colors.primary}; color: ${colors.text === 'white' ? '#fff' : '#000'};" title="primary">pri</div>
          <div class="swatch" style="background: ${colors.accent}; color: ${colors.text === 'white' ? '#fff' : '#000'};" title="accent">acc</div>
        </div>
        ${showFlower ? `<div class="flower-preview">${flowerSVG}</div>` : ''}
      </div>
    </div>`;
}

function buildHTML(): string {
  const compareDids = TEST_DIDS.slice(0, 4);
  const currentPalettes = TEST_DIDS.map((did) =>
    buildPaletteHTML(did, generateColorsFromDid(did), '', true)
  ).join('\n');

  const oldRow = compareDids
    .map((did) => buildPaletteHTML(did, generateColorsOld(did), 'OLD (pre-refactor)', false))
    .join('\n');
  const refactorRow = compareDids
    .map((did) => buildPaletteHTML(did, generateColorsRefactor(did), 'REFACTOR (55f1484)', false))
    .join('\n');
  const currentRow = compareDids
    .map((did) => buildPaletteHTML(did, generateColorsFromDid(did), 'PALETTE-BASED (current)', true))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Color Variation Preview – spores.garden</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 24px;
      background: #1a1a1a;
      color: #e0e0e0;
    }
    h1 {
      font-size: 1.25rem;
      margin: 0 0 8px 0;
      font-weight: 600;
    }
    .subtitle {
      color: #888;
      font-size: 0.875rem;
      margin-bottom: 24px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }
    .palette {
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #333;
    }
    .palette-header {
      padding: 8px 12px;
      background: #2a2a2a;
      font-size: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .palette-label { font-weight: 600; }
    .palette-did {
      font-size: 0.65rem;
      color: #666;
      word-break: break-all;
    }
    .palette-bg {
      padding: 16px;
      min-height: 140px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .swatches {
      display: flex;
      gap: 8px;
    }
    .swatch {
      width: 36px;
      height: 36px;
      border-radius: 6px;
      font-size: 0.6rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .flower-preview {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .flower-preview svg {
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
    }
    .compare-section {
      margin-bottom: 32px;
    }
    .compare-section h2 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 12px 0;
      color: #aaa;
    }
  </style>
</head>
<body>
  <h1>Color Variation Preview</h1>
  <p class="subtitle">Compare OLD (pre-refactor) vs REFACTOR (55f1484) vs PALETTE-BASED (current).</p>

  <div class="compare-section">
    <h2>OLD (pre-refactor) – light pastel bg, palette-based primary/accent</h2>
    <div class="grid">${oldRow}</div>
  </div>
  <div class="compare-section">
    <h2>REFACTOR (55f1484) – vibrant bg, high-sat primary/accent</h2>
    <div class="grid">${refactorRow}</div>
  </div>
  <div class="compare-section">
    <h2>PALETTE-BASED – derived from bg→text gradient, saturate(1.5)</h2>
    <div class="grid">${currentRow}</div>
  </div>

  <div class="compare-section">
    <h2>Full variation (current params, all DIDs)</h2>
    <div class="grid">${currentPalettes}</div>
  </div>
</body>
</html>`;
}

function main() {
  const html = buildHTML();
  const outPath = 'color-preview.html';
  writeFileSync(outPath, html, 'utf-8');
  console.log(`Wrote ${outPath}`);
  console.log('Open in browser to see color variations.');
}

main();
