/**
 * Isoline Generator
 *
 * Combines noise generation and marching squares to create
 * topographic-style contour backgrounds for garden pages.
 * Each DID produces a unique, deterministic pattern.
 */

import { createSeededNoise2D, generateNoiseGrid } from './noise.js';
import { extractContours, generateThresholds, type ContourPath } from './marching-squares.js';

export interface IsolineConfig {
  noiseScale: number;      // 0.015-0.04 (lower = larger features)
  noiseOctaves: number;    // 1-3
  contourCount: number;    // 3-8 levels
  strokeWidth: number;     // 1-2px
  strokeColor: string;     // From theme (text color with low alpha)
  fillEnabled: boolean;    // Whether to add subtle fills between contours
  fillOpacity: number;     // 0.02-0.04
}

export interface ThemeColors {
  background?: string;
  text?: string;
  primary?: string;
  accent?: string;
  muted?: string;
  border?: string;
}

// Configuration options
const NOISE_SCALES = [0.015, 0.02, 0.025, 0.03, 0.035];
const NOISE_OCTAVES = [1, 2, 3];
const CONTOUR_COUNTS = [3, 4, 5, 6, 7, 8];
const STROKE_WIDTHS = [1, 1.5];

/**
 * Simple hash function to convert a string to a number
 */
function stringToHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Parse hex color to RGB components
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Generate isoline configuration from a DID
 * Uses different bit ranges of the hash for each parameter
 */
export function generateIsolineConfigFromDid(did: string, colors: ThemeColors): IsolineConfig {
  const hash = stringToHash(did);

  // Extract parameters from different bit ranges
  const noiseScaleIndex = (hash >> 15) % NOISE_SCALES.length;
  const noiseOctavesIndex = (hash >> 18) % NOISE_OCTAVES.length;
  const contourCountIndex = (hash >> 20) % CONTOUR_COUNTS.length;
  const strokeWidthIndex = (hash >> 23) % STROKE_WIDTHS.length;
  const fillEnabledBit = (hash >> 24) % 4 === 0; // 25% chance

  // Derive stroke color from theme text color with low alpha
  const textColor = colors.text || '#000000';
  const rgb = hexToRgb(textColor);
  const strokeColor = rgb
    ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`
    : 'rgba(0, 0, 0, 0.12)';

  return {
    noiseScale: NOISE_SCALES[noiseScaleIndex],
    noiseOctaves: NOISE_OCTAVES[noiseOctavesIndex],
    contourCount: CONTOUR_COUNTS[contourCountIndex],
    strokeWidth: STROKE_WIDTHS[strokeWidthIndex],
    strokeColor,
    fillEnabled: fillEnabledBit,
    fillOpacity: 0.03
  };
}

/**
 * Generate SVG string for isoline pattern
 *
 * @param config - Isoline configuration
 * @param width - SVG width
 * @param height - SVG height
 * @param seed - Numeric seed for noise generation
 * @returns SVG string
 */
export function generateIsolineSVG(
  config: IsolineConfig,
  width: number,
  height: number,
  seed: number
): string {
  // Grid resolution - balance between quality and performance
  // 80x80 gives smooth curves at 800px tile size (~10px per cell)
  const gridSize = 80;

  // Generate noise grid
  const noise = createSeededNoise2D(seed);
  const grid = generateNoiseGrid(
    noise,
    gridSize,
    gridSize,
    config.noiseScale,
    config.noiseOctaves,
    0.5 // persistence
  );

  // Generate contour thresholds
  const thresholds = generateThresholds(config.contourCount, 0.25, 0.75);

  // Extract contours
  const contours = extractContours(grid, thresholds, width, height);

  // Build SVG
  const paths = buildSVGPaths(contours, config);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .isoline { fill: none; stroke-linecap: round; stroke-linejoin: round; }
      .isoline-fill { stroke: none; }
    </style>
  </defs>
  ${paths}
</svg>`;
}

/**
 * Build SVG path elements from contours
 */
function buildSVGPaths(contours: ContourPath[], config: IsolineConfig): string {
  const paths: string[] = [];

  // Add filled regions if enabled
  if (config.fillEnabled && contours.length > 1) {
    for (let i = 0; i < contours.length; i++) {
      const contour = contours[i];
      // Vary fill opacity based on contour level
      const opacity = config.fillOpacity * (1 - contour.threshold * 0.5);
      const fillColor = config.strokeColor.replace(/[\d.]+\)$/, `${opacity})`);

      paths.push(
        `  <path class="isoline-fill" d="${contour.d}" fill="${fillColor}" />`
      );
    }
  }

  // Add contour lines
  for (const contour of contours) {
    paths.push(
      `  <path class="isoline" d="${contour.d}" stroke="${config.strokeColor}" stroke-width="${config.strokeWidth}" />`
    );
  }

  return paths.join('\n');
}

/**
 * Generate data URI for isoline pattern
 * Suitable for use as CSS background-image
 *
 * @param config - Isoline configuration
 * @param width - Pattern tile width
 * @param height - Pattern tile height
 * @param seed - Numeric seed for noise generation
 * @returns Data URI string
 */
export function generateIsolineDataURI(
  config: IsolineConfig,
  width: number,
  height: number,
  seed: number
): string {
  const svg = generateIsolineSVG(config, width, height, seed);
  // Encode for data URI
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Cache for generated isoline data URIs
 * Key: DID string
 * Value: { dataUri, config }
 */
const isolineCache = new Map<string, { dataUri: string; config: IsolineConfig }>();

/**
 * Get or generate isoline data URI for a DID
 * Uses caching to avoid regeneration
 *
 * @param did - DID string
 * @param colors - Theme colors
 * @param width - Pattern tile width (default 800)
 * @param height - Pattern tile height (default 800)
 * @returns Object with dataUri and config
 */
export function getIsolineForDid(
  did: string,
  colors: ThemeColors,
  width: number = 800,
  height: number = 800
): { dataUri: string; config: IsolineConfig } {
  // Check cache
  const cached = isolineCache.get(did);
  if (cached) {
    return cached;
  }

  // Generate config and pattern
  const config = generateIsolineConfigFromDid(did, colors);
  const seed = stringToHash(did);
  const dataUri = generateIsolineDataURI(config, width, height, seed);

  // Cache result
  const result = { dataUri, config };
  isolineCache.set(did, result);

  return result;
}

/**
 * Clear the isoline cache
 * Call when theme colors change significantly
 */
export function clearIsolineCache(): void {
  isolineCache.clear();
}
