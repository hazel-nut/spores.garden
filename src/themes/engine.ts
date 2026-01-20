import chroma from 'chroma-js';

/**
 * Theme Engine
 *
 * Handles applying themes (presets + custom overrides) to the site.
 * Uses CSS custom properties for easy runtime theming.
 */

const FONT_PAIRINGS = [
  { heading: "'Inter', sans-serif", body: "'Inter', sans-serif" },
  { heading: "'Roboto Slab', serif", body: "'Roboto', sans-serif" },
  { heading: "'Playfair Display', serif", body: "'Source Sans Pro', sans-serif" },
  { heading: "'Montserrat', sans-serif", body: "'Lato', sans-serif" },
  { heading: "'Oswald', sans-serif", body: "'Roboto', sans-serif" },
];

const BORDER_STYLES = ['solid', 'dashed', 'dotted', 'double', 'groove'];
const BORDER_WIDTHS = ['1px', '2px', '3px', '4px'];

const THEME_PRESETS = {
  minimal: {
    colors: {
      background: '#ffffff',
      text: '#1a1a1a',
      primary: '#0066cc',
      accent: '#0066cc',
      muted: '#666666',
      border: '#e0e0e0'
    },
    fonts: {
      heading: 'system-ui, -apple-system, sans-serif',
      body: 'system-ui, -apple-system, sans-serif'
    }
  },
  dark: {
    colors: {
      background: '#0a0a0a',
      text: '#f0f0f0',
      primary: '#60a5fa',
      accent: '#60a5fa',
      muted: '#a0a0a0',
      border: '#333333'
    },
    fonts: {
      heading: 'system-ui, -apple-system, sans-serif',
      body: 'system-ui, -apple-system, sans-serif'
    }
  },
  bold: {
    colors: {
      background: '#fef3c7',
      text: '#1c1917',
      primary: '#dc2626',
      accent: '#dc2626',
      muted: '#78716c',
      border: '#d6d3d1'
    },
    fonts: {
      heading: 'Georgia, serif',
      body: 'system-ui, -apple-system, sans-serif'
    }
  },
  retro: {
    colors: {
      background: '#000080',
      text: '#00ff00',
      primary: '#ff00ff',
      accent: '#ffff00',
      muted: '#00ffff',
      border: '#ff00ff'
    },
    fonts: {
      heading: '"Courier New", monospace',
      body: '"Courier New", monospace'
    }
  }
};

let customStyleEl = null;

/**
 * Simple hash function to convert a string to a number
 */
function stringToHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generates a theme from a DID string
 */
export function generateThemeFromDid(did) {
  const hash = stringToHash(did);
  const hue = hash % 360;

  // Generate a background color from the hash
  const backgroundColor = chroma.hsl(hue, 0.6, 0.9);

  // Ensure sufficient contrast for text color
  const textColor = chroma.contrast(backgroundColor, 'white') > 4.5 ? 'white' : 'black';

  // Generate a color palette
  const palette = chroma.scale([backgroundColor, textColor]).mode('lch').colors(5);

  const colors = {
    background: backgroundColor.hex(),
    text: textColor,
    primary: chroma(palette[2]).saturate(1).hex(),
    accent: chroma(palette[3]).saturate(1).hex(),
    muted: chroma.mix(backgroundColor, textColor, 0.5).hex(),
    border: chroma.mix(backgroundColor, textColor, 0.2).hex()
  };

  const fontPairingIndex = hash % FONT_PAIRINGS.length;
  const fonts = FONT_PAIRINGS[fontPairingIndex];
  const borderStyleIndex = hash % BORDER_STYLES.length;
  const borderStyle = BORDER_STYLES[borderStyleIndex];
  const borderWidthIndex = hash % BORDER_WIDTHS.length;
  const borderWidth = BORDER_WIDTHS[borderWidthIndex];

  const metadata = {
    hash,
    hue,
    fontPairingIndex,
    borderStyleIndex,
    borderWidthIndex,
  };

  return { theme: { colors, fonts, borderStyle, borderWidth }, metadata };
}


/**
 * Apply a theme to the document
 */
export function applyTheme(themeConfig: any = {}, customCss = '') {
  const preset = themeConfig.preset || 'minimal';
  const presetTheme = THEME_PRESETS[preset] || THEME_PRESETS.minimal;

  // Merge preset with custom overrides
  const colors = { ...presetTheme.colors, ...themeConfig.colors };
  const fonts = { ...presetTheme.fonts, ...themeConfig.fonts };
  const borderStyle = themeConfig.borderStyle || 'solid';
  const borderWidth = themeConfig.borderWidth || '2px';

  // Apply CSS custom properties
  const root = document.documentElement;

  // Colors
  Object.entries(colors).forEach(([key, value]) => {
    if (value) {
      root.style.setProperty(`--color-${key}`, value as string);
    }
  });

  // Set border-dark to be inverted for dark mode (use text color for borders in dark mode)
  // In dark mode: dark background -> light borders (text color)
  // In light mode: light background -> dark borders (text color)
  const borderDark = colors.text || presetTheme.colors.text || '#000000';
  root.style.setProperty('--color-border-dark', borderDark);

  // Fonts
  Object.entries(fonts).forEach(([key, value]) => {
    if (value) {
      root.style.setProperty(`--font-${key}`, value as string);
    }
  });

  // Border style
  root.style.setProperty('--border-style', borderStyle);
  root.style.setProperty('--border-width', borderWidth);

  // Apply custom CSS
  if (customCss) {
    if (!customStyleEl) {
      customStyleEl = document.createElement('style');
      customStyleEl.id = 'custom-css';
      document.head.appendChild(customStyleEl);
    }
    customStyleEl.textContent = customCss;
  } else if (customStyleEl) {
    customStyleEl.textContent = '';
  }

  // Add theme class to body
  document.body.className = document.body.className
    .replace(/theme-\w+/g, '')
    .trim();
  document.body.classList.add(`theme-${preset}`);
}

/**
 * Get available theme presets
 */
export function getThemePresets() {
  return Object.keys(THEME_PRESETS);
}

/**
 * Get a specific theme preset
 */
export function getThemePreset(name) {
  return THEME_PRESETS[name];
}

/**
 * Map a theme preset name to its color values for PDS storage
 * 
 * This function returns the color mapping for a given preset, which can be
 * written directly to the PDS. The preset name itself is not saved to PDS,
 * only the color values are persisted.
 * 
 * @param presetName - The name of the theme preset (e.g., 'minimal', 'dark', 'bold', 'retro')
 * @returns An object with color values, or null if preset doesn't exist
 * 
 * @example
 * const colors = getPresetColors('dark');
 * // Returns: { background: '#0a0a0a', text: '#f0f0f0', primary: '#60a5fa', ... }
 */
export function getPresetColors(presetName) {
  const preset = THEME_PRESETS[presetName];
  if (!preset) {
    return null;
  }
  // Return a copy of the colors object
  return { ...preset.colors };
}