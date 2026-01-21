import { getRecord, resolveHandle } from './at-client';
import { putRecord, getCurrentDid, isLoggedIn, deleteRecord } from './oauth';
import { getThemePreset, generateThemeFromDid } from './themes/engine';

const CONFIG_COLLECTION = 'garden.spores.site.config';
const STYLE_COLLECTION = 'garden.spores.site.style';
const SECTIONS_COLLECTION = 'garden.spores.site.sections';
const SPECIAL_SPORE_COLLECTION = 'garden.spores.item.specialSpore';
const CONFIG_RKEY = 'self';

let currentConfig = null;
let siteOwnerDid = null;

/**
 * Default configuration for new sites
 */
function getDefaultConfig() {
  const defaultPreset = getThemePreset('minimal');
  return {
    title: 'spores.garden',
    subtitle: '',
    description: '',
    favicon: '',
    theme: {
      preset: 'minimal',
      colors: { ...defaultPreset.colors },
      fonts: { ...defaultPreset.fonts },
      borderStyle: 'solid',
      borderWidth: '2px',
    },
    customCss: '',
    sections: [],
  };
}

/**
 * Parse identifier from URL (supports both path-based and query params)
 * Supports: /@handle, /@did, ?handle=..., ?did=...
 */
function parseIdentifierFromUrl() {
  const pathMatch = location.pathname.match(/^\/@(.+)$/);
  if (pathMatch) {
    const identifier = pathMatch[1];
    if (identifier.startsWith('did:')) {
      return { type: 'did', value: identifier };
    } else {
      return { type: 'handle', value: identifier };
    }
  }

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
    siteOwnerDid = null;
    currentConfig = getDefaultConfig();
    return currentConfig;
  }

  await loadUserConfig(siteOwnerDid);

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
 * Load config for a given user DID
 */
export async function loadUserConfig(did) {
  if (!did) {
    currentConfig = getDefaultConfig();
    return null;
  }

  try {
    const [configRecord, styleRecord, sectionsRecord] = await Promise.all([
        getRecord(did, CONFIG_COLLECTION, CONFIG_RKEY),
        getRecord(did, STYLE_COLLECTION, CONFIG_RKEY),
        getRecord(did, SECTIONS_COLLECTION, CONFIG_RKEY)
    ]);

    // If any record is missing, user is not fully onboarded
    if (!configRecord || !styleRecord || !sectionsRecord) {
      return null;
    }

    const defaultConfig = getDefaultConfig();
    const config = configRecord.value;
    const styleConfig = styleRecord.value;
    const sectionsConfig = sectionsRecord.value;

    currentConfig = {
      ...defaultConfig,
      ...config,
      ...styleConfig,
      ...sectionsConfig,
    };
    
    // PDS only has colors, not presets - add frontend-only preset for UI
    if (currentConfig.theme) {
      if (!currentConfig.theme.preset) {
        currentConfig.theme.preset = 'minimal';
      }
      if (!currentConfig.theme.colors) {
        currentConfig.theme.colors = {};
      }
    }

    siteOwnerDid = did;
    return currentConfig;
  } catch (error) {
    console.warn('Failed to load user config, using default:', error);
    currentConfig = getDefaultConfig();
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
    const [configRecord, styleRecord, sectionsRecord] = await Promise.all([
        getRecord(did, CONFIG_COLLECTION, CONFIG_RKEY),
        getRecord(did, STYLE_COLLECTION, CONFIG_RKEY),
        getRecord(did, SECTIONS_COLLECTION, CONFIG_RKEY)
    ]);
    return configRecord !== null && styleRecord !== null && sectionsRecord !== null;
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
  };
  return currentConfig;
}

/**
 * Save config to PDS
 */
export async function saveConfig({ isInitialOnboarding = false } = {}) {
  if (!isLoggedIn()) {
    throw new Error('Must be logged in to save config');
  }

  const did = getCurrentDid();
  if (did !== siteOwnerDid && siteOwnerDid !== null) {
    throw new Error('Can only save config to your own PDS');
  }

  if (!siteOwnerDid) {
    siteOwnerDid = did;
  }

  const configToSave: any = {
    $type: CONFIG_COLLECTION,
    title: currentConfig.title,
    subtitle: currentConfig.subtitle,
    description: currentConfig.description,
    favicon: currentConfig.favicon,
  };

  const styleToSave: any = {
    $type: STYLE_COLLECTION,
    theme: currentConfig.theme,
    customCss: currentConfig.customCss,
  };

  const sectionsToSave: any = {
    $type: SECTIONS_COLLECTION,
    sections: currentConfig.sections,
  };

  if (!styleToSave.customCss || styleToSave.customCss.trim() === '') {
    delete styleToSave.customCss;
  }

  if (styleToSave.theme) {
    const themeToSave: any = {};
    if (styleToSave.theme.colors && Object.keys(styleToSave.theme.colors).length > 0) {
      themeToSave.colors = styleToSave.theme.colors;
    }
    if (styleToSave.theme.fonts && Object.keys(styleToSave.theme.fonts).length > 0) {
        themeToSave.fonts = styleToSave.theme.fonts;
    }
    if (styleToSave.theme.borderStyle) {
        themeToSave.borderStyle = styleToSave.theme.borderStyle;
    }
    if (styleToSave.theme.borderWidth) {
        themeToSave.borderWidth = styleToSave.theme.borderWidth;
    }
    if (Object.keys(themeToSave).length > 0) {
      styleToSave.theme = themeToSave;
    } else {
      delete styleToSave.theme;
    }
  }

  const promises = [
    putRecord(CONFIG_COLLECTION, CONFIG_RKEY, configToSave),
    putRecord(STYLE_COLLECTION, CONFIG_RKEY, styleToSave)
  ];

  if (isInitialOnboarding) {
    if (sectionsToSave.sections && sectionsToSave.sections.length > 0) {
        promises.push(putRecord(SECTIONS_COLLECTION, CONFIG_RKEY, sectionsToSave));
    }
    
    // 1 in 10 chance to get a special spore
    if (Math.random() < 0.1) {
        promises.push(putRecord(SPECIAL_SPORE_COLLECTION, CONFIG_RKEY, {
            $type: SPECIAL_SPORE_COLLECTION,
            ownerDid: did,
            lastCapturedAt: new Date().toISOString(),
            history: [{ did: did, timestamp: new Date().toISOString() }]
        }));
    }
  } else {
    if (sectionsToSave.sections && sectionsToSave.sections.length > 0) {
        promises.push(putRecord(SECTIONS_COLLECTION, CONFIG_RKEY, sectionsToSave));
    } else {
        promises.push(deleteRecord(SECTIONS_COLLECTION, CONFIG_RKEY));
    }
  }

  await Promise.all(promises);

  return currentConfig;
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
    return false;
  }
  
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
    return false;
  }
  
  [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
  return true;
}

/**
 * Update theme
 */
export function updateTheme(themeUpdates) {
  if (!currentConfig.theme) {
    currentConfig.theme = { preset: 'minimal', colors: {}, fonts: {}, borderStyle: 'solid' };
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
