/**
 * Theme Engine
 *
 * Handles applying themes (presets + custom overrides) to the site.
 * Uses CSS custom properties for easy runtime theming.
 */

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
 * Apply a theme to the document
 */
export function applyTheme(themeConfig = {}, customCss = '') {
  const preset = themeConfig.preset || 'minimal';
  const presetTheme = THEME_PRESETS[preset] || THEME_PRESETS.minimal;

  // Merge preset with custom overrides
  const colors = { ...presetTheme.colors, ...themeConfig.colors };
  const fonts = { ...presetTheme.fonts, ...themeConfig.fonts };

  // Apply CSS custom properties
  const root = document.documentElement;

  // Colors
  Object.entries(colors).forEach(([key, value]) => {
    if (value) {
      root.style.setProperty(`--color-${key}`, value);
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
      root.style.setProperty(`--font-${key}`, value);
    }
  });

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
