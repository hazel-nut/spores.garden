/**
 * Site configuration management
 *
 * Loads and saves site config from the user's PDS.
 * Supports URL-based routing via /@handle or ?did= params.
 */

import { getRecord, resolveHandle } from './at-client';
import { putRecord, getCurrentDid, isLoggedIn } from './oauth';
import { getThemePreset } from './themes/engine';

const CONFIG_COLLECTION = 'garden.spores.site.config';
const CONFIG_RKEY = 'self';

let currentConfig = null;
let siteOwnerDid = null;

/**
 * Default configuration for new sites
 */
function getDefaultConfig() {
  // Get default colors from minimal preset
  const defaultPreset = getThemePreset('minimal');
  return {
    $type: CONFIG_COLLECTION,
    title: 'spores.garden',
    sections: [],
    theme: {
      preset: 'minimal', // Frontend-only, not saved to PDS
      colors: { ...defaultPreset.colors } // All colors saved to PDS
    },
    customCss: ''
  };
}

/**
 * Parse identifier from URL (supports both path-based and query params)
 * Supports: /@handle, /@did, ?handle=..., ?did=...
 */
function parseIdentifierFromUrl() {
  // First check pathname for /@handle or /@did format
  const pathMatch = location.pathname.match(/^\/@(.+)$/);
  if (pathMatch) {
    const identifier = pathMatch[1];
    // Check if it looks like a DID (starts with did:)
    if (identifier.startsWith('did:')) {
      return { type: 'did', value: identifier };
    } else {
      // Assume it's a handle
      return { type: 'handle', value: identifier };
    }
  }

  // Fall back to query params
  const params = new URLSearchParams(location.search);
  const didParam = params.get('did');
  const handleParam = params.get('handle');

  if (didParam) {
    return { type: 'did', value: didParam };
  } else if (handleParam) {
    return { type: 'handle', value: handleParam };
  }

  return null;
}

/**
 * Initialize config - determine site owner and load config
 */
export async function initConfig() {
  // Check URL for DID or handle (supports both path-based and query params)
  const identifier = parseIdentifierFromUrl();

  if (identifier) {
    if (identifier.type === 'did') {
      siteOwnerDid = identifier.value;
    } else if (identifier.type === 'handle') {
      try {
        siteOwnerDid = await resolveHandle(identifier.value);
      } catch (error) {
        console.error('Failed to resolve handle:', error);
        throw new Error(`Failed to resolve handle "${identifier.value}": ${error.message}`);
      }
    }
  } else {
    // No owner specified - will need to login to create site
    siteOwnerDid = null;
    currentConfig = getDefaultConfig();
    return currentConfig;
  }

  // Try to load config from PDS
  try {
    const record = await getRecord(siteOwnerDid, CONFIG_COLLECTION, CONFIG_RKEY);
    if (record) {
      currentConfig = record.value;
      // PDS only has colors, not presets - add frontend-only preset for UI
      if (currentConfig.theme) {
        // Try to match colors to a preset, otherwise default to minimal
        if (!currentConfig.theme.preset) {
          currentConfig.theme.preset = 'minimal';
        }
        // Ensure colors exist (should always be present from PDS)
        if (!currentConfig.theme.colors) {
          currentConfig.theme.colors = {};
        }
      }
    } else {
      currentConfig = getDefaultConfig();
    }
  } catch (error) {
    console.warn('Failed to load config, using default:', error);
    currentConfig = getDefaultConfig();
  }

  return currentConfig;
}

/**
 * Get current config
 */
export function getConfig() {
  return currentConfig;
}

/**
 * Get site owner DID
 */
export function getSiteOwnerDid() {
  return siteOwnerDid;
}

/**
 * Check if current user is the site owner
 */
export function isOwner() {
  if (!isLoggedIn()) return false;
  const currentDid = getCurrentDid();
  // If no site owner set yet, logged-in user becomes owner
  if (!siteOwnerDid && currentDid) {
    siteOwnerDid = currentDid;
    return true;
  }
  return currentDid && currentDid === siteOwnerDid;
}

/**
 * Set site owner DID (used when user logs in to create new site)
 */
export function setSiteOwnerDid(did) {
  siteOwnerDid = did;
}

/**
 * Load config for logged-in user (after login)
 * This checks if the user has an existing config record
 */
export async function loadUserConfig(did) {
  if (!did) {
    return null;
  }

  try {
    const record = await getRecord(did, CONFIG_COLLECTION, CONFIG_RKEY);
    if (record && record.value) {
      // User has existing config
      siteOwnerDid = did;
      currentConfig = record.value;
      // PDS only has colors, not presets - add frontend-only preset for UI
      if (currentConfig.theme) {
        // Try to match colors to a preset, otherwise default to minimal
        if (!currentConfig.theme.preset) {
          currentConfig.theme.preset = 'minimal';
        }
        // Ensure colors exist (should always be present from PDS)
        if (!currentConfig.theme.colors) {
          currentConfig.theme.colors = {};
        }
      }
      return currentConfig;
    }
    // No config found - user is new
    return null;
  } catch (error) {
    console.warn('Failed to load user config:', error);
    return null;
  }
}

/**
 * Check if user has an existing config record
 */
export async function hasUserConfig(did) {
  if (!did) {
    return false;
  }

  try {
    const record = await getRecord(did, CONFIG_COLLECTION, CONFIG_RKEY);
    return record !== null && record.value !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Update config (in memory)
 */
export function updateConfig(updates) {
  currentConfig = {
    ...currentConfig,
    ...updates,
    $type: CONFIG_COLLECTION
  };
  return currentConfig;
}

/**
 * Save config to PDS
 */
export async function saveConfig() {
  if (!isLoggedIn()) {
    throw new Error('Must be logged in to save config');
  }

  const did = getCurrentDid();
  if (did !== siteOwnerDid && siteOwnerDid !== null) {
    throw new Error('Can only save config to your own PDS');
  }

  // If no site owner set, we're creating a new site
  if (!siteOwnerDid) {
    siteOwnerDid = did;
  }

  const configToSave: any = {
    ...currentConfig,
    $type: CONFIG_COLLECTION
  };

  // Remove customCss if it's empty to keep config clean
  if (!configToSave.customCss || configToSave.customCss.trim() === '') {
    delete configToSave.customCss;
  }

  // Process theme: only save colors to PDS (preset is frontend-only)
  if (configToSave.theme) {
    const themeToSave: any = {};
    
    // Only save colors (preset is not saved to PDS)
    if (configToSave.theme.colors && Object.keys(configToSave.theme.colors).length > 0) {
      themeToSave.colors = configToSave.theme.colors;
    }
    
    // Only save theme if it has colors
    if (Object.keys(themeToSave.colors || {}).length > 0) {
      configToSave.theme = themeToSave;
    } else {
      delete configToSave.theme;
    }
  }

  await putRecord(CONFIG_COLLECTION, CONFIG_RKEY, configToSave);

  return configToSave;
}

/**
 * Add a section to the config
 */
export function addSection(section) {
  const id = section.id || `section-${Date.now()}`;
  const newSection = { ...section, id };

  currentConfig.sections = [...(currentConfig.sections || []), newSection];
  return newSection;
}

/**
 * Update a section by ID
 */
export function updateSection(id, updates) {
  currentConfig.sections = currentConfig.sections.map(section =>
    section.id === id ? { ...section, ...updates } : section
  );
}

/**
 * Remove a section by ID
 */
export function removeSection(id) {
  currentConfig.sections = currentConfig.sections.filter(section => section.id !== id);
}

/**
 * Reorder sections
 */
export function reorderSections(orderedIds) {
  const sectionMap = new Map(currentConfig.sections.map(s => [s.id, s]));
  currentConfig.sections = orderedIds.map(id => sectionMap.get(id)).filter(Boolean);
}

/**
 * Move a section up in the order
 */
export function moveSectionUp(sectionId) {
  const sections = currentConfig.sections || [];
  const index = sections.findIndex(s => s.id === sectionId);
  
  if (index <= 0) {
    return false; // Already at top or not found
  }
  
  // Swap with previous section
  [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
  return true;
}

/**
 * Move a section down in the order
 */
export function moveSectionDown(sectionId) {
  const sections = currentConfig.sections || [];
  const index = sections.findIndex(s => s.id === sectionId);
  
  if (index < 0 || index >= sections.length - 1) {
    return false; // Already at bottom or not found
  }
  
  // Swap with next section
  [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
  return true;
}

/**
 * Update theme
 */
export function updateTheme(themeUpdates) {
  // Ensure theme object exists
  if (!currentConfig.theme) {
    currentConfig.theme = { preset: 'minimal', colors: {} };
  }
  
  currentConfig.theme = {
    ...currentConfig.theme,
    ...themeUpdates
  };
  return currentConfig.theme;
}

/**
 * Set custom CSS
 */
export function setCustomCss(css) {
  currentConfig.customCss = css;
}
