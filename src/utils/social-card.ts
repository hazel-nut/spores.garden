import { getConfig } from '../config';
import { generateThemeFromDid } from '../themes/engine';
import { getCurrentDid } from '../oauth';

const SOCIAL_CARD_WIDTH = 1200;
const SOCIAL_CARD_HEIGHT = 630;

/**
 * Generates a social card image (data URL) for the current garden.
 */
export async function generateSocialCardImage(): Promise<string> {
  const config = getConfig();
  const currentDid = getCurrentDid();

  const canvas = document.createElement('canvas');
  canvas.width = SOCIAL_CARD_WIDTH;
  canvas.height = SOCIAL_CARD_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Use the theme to get colors
  const { theme } = generateThemeFromDid(currentDid || 'did:example:default'); // Fallback DID
  const { colors } = theme;

  // Background
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, SOCIAL_CARD_WIDTH, SOCIAL_CARD_HEIGHT);

  // DID Visualization (monochrome grid)
  const vizSize = 250;
  const vizX = SOCIAL_CARD_WIDTH - vizSize - 50;
  const vizY = (SOCIAL_CARD_HEIGHT - vizSize) / 2;

  // Re-create the did-visualization logic here, but render to canvas
  const hash = DidVisualizationStringToHash(currentDid || 'did:example:default');
  const gridSize = 10;
  const cellSize = vizSize / gridSize;

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const binaryValue = ((hash + i * gridSize + j) % 2);
      ctx.fillStyle = binaryValue === 1 ? colors.primary : colors.background;
      ctx.fillRect(vizX + j * cellSize, vizY + i * cellSize, cellSize, cellSize);
    }
  }

  // Text content
  ctx.fillStyle = colors.text;
  ctx.font = '60px ' + config.theme?.fonts?.heading || 'sans-serif';
  ctx.fillText(config.title || 'spores.garden', 50, 150);

  ctx.font = '30px ' + config.theme?.fonts?.body || 'sans-serif';
  ctx.fillText(config.subtitle || 'A personal ATProto website', 50, 200);

  // Link to garden
  ctx.font = '24px ' + config.theme?.fonts?.body || 'sans-serif';
  ctx.fillText(window.location.origin, 50, SOCIAL_CARD_HEIGHT - 50);

  return canvas.toDataURL('image/png');
}

// Helper function (copied from did-visualization.ts to avoid DOM rendering)
function DidVisualizationStringToHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
