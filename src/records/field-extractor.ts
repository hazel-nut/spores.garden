/**
 * Field Extractor - intelligently extract common fields from any record
 *
 * This is the key abstraction that makes layouts work with any lexicon.
 * Instead of hardcoding lexicon support, we extract common fields by
 * looking for them under different names.
 *
 * EXPERIMENTAL FEATURE
 * ====================
 * This module enables generic rendering of AT Protocol records from any
 * lexicon, not just known ones. The heuristic-based extraction works well
 * for common patterns but may produce unexpected results for arbitrary lexicons.
 *
 * Known-good lexicons (tested and work well):
 * - app.bsky.feed.post (Bluesky posts)
 * - app.bsky.actor.profile (Bluesky profiles)
 * - com.whtwnd.blog.entry (WhiteWind blog posts)
 * - blue.linkat.board (Linkat link boards)
 * - garden.spores.* (spores.garden native types)
 *
 * For other lexicons, consider displaying a warning to users that the
 * preview may look different than expected.
 *
 * TODO: Future improvements
 * - Add lexicon schema registry for proper field mapping
 * - Allow users to customize field mappings per lexicon
 * - Provide UI for mapping unknown fields to display slots
 */

/**
 * Lexicons known to render well with the generic field extractor.
 * Other lexicons will still work but may have lower confidence scores.
 */
const KNOWN_LEXICONS = new Set([
  'app.bsky.feed.post',
  'app.bsky.actor.profile',
  'app.bsky.graph.list',
  'com.whtwnd.blog.entry',
  'blue.linkat.board',
  'garden.spores.site.config',
  'garden.spores.content.block',
  'garden.spores.content.profile',
  'garden.spores.guestbook.entry'
]);

/**
 * Check if a lexicon is known to work well with the field extractor
 */
export function isKnownLexicon(type: string | undefined): boolean {
  if (!type) return false;
  return KNOWN_LEXICONS.has(type);
}

/**
 * Field mappings - arrays of possible field names for each semantic field
 */
const FIELD_MAPPINGS = {
  title: ['title', 'name', 'displayName', 'subject', 'heading'],
  content: ['content', 'text', 'description', 'message', 'body', 'summary', 'bio'],
  url: ['url', 'uri', 'link', 'href', 'website'],
  image: ['image', 'avatar', 'thumbnail', 'banner', 'picture', 'photo'],
  images: ['images', 'photos', 'media', 'attachments', 'blobs'],
  date: ['createdAt', 'indexedAt', 'publishedAt', 'updatedAt', 'timestamp', 'date'],
  author: ['author', 'creator', 'by', 'from'],
  tags: ['tags', 'labels', 'categories', 'topics', 'keywords'],
  items: ['items', 'links', 'entries', 'records', 'children']
};

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return undefined;
    // Handle array access like "images[0]"
    const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrKey, index] = arrayMatch;
      return current[arrKey]?.[parseInt(index, 10)];
    }
    return current[key];
  }, obj);
}

/**
 * Extract a single field from a record
 */
function extractField(record, fieldType) {
  const possibleNames = FIELD_MAPPINGS[fieldType] || [fieldType];

  for (const name of possibleNames) {
    // Check direct property
    if (record[name] !== undefined && record[name] !== null && record[name] !== '') {
      return record[name];
    }

    // Check value property (for AT Protocol records)
    if (record.value?.[name] !== undefined && record.value?.[name] !== null && record.value?.[name] !== '') {
      return record.value[name];
    }

    // Check nested paths
    const nestedValue = getNestedValue(record, name);
    if (nestedValue !== undefined && nestedValue !== null && nestedValue !== '') {
      return nestedValue;
    }
  }

  return undefined;
}

/**
 * Extract all common fields from a record
 */
export function extractFields(record) {
  const value = record.value || record;

  return {
    // Core content fields
    title: extractField(record, 'title'),
    content: extractField(record, 'content'),
    url: extractField(record, 'url'),

    // Media
    image: extractImage(record),
    images: extractImages(record),

    // Metadata
    date: extractDate(record),
    author: extractField(record, 'author'),
    tags: extractTags(record),

    // Collections
    items: extractField(record, 'items'),

    // Original record reference
    $type: value.$type,
    uri: record.uri,
    cid: record.cid,

    // Raw value for custom rendering
    $raw: value
  };
}

/**
 * Extract image field, handling various formats
 */
function extractImage(record) {
  const value = record.value || record;

  // Direct image field
  for (const name of FIELD_MAPPINGS.image) {
    const img = value[name];
    if (!img) continue;

    // If it's a string URL, return directly
    if (typeof img === 'string') return img;

    // If it's a blob reference
    if (img.$type === 'blob' || img.ref) {
      return formatBlobUrl(record, img);
    }

    // If it has a url property
    if (img.url) return img.url;

    // If it has a thumb property (Bluesky style)
    if (img.thumb) return img.thumb;
  }

  // Check first image in images array
  const images = extractImages(record);
  if (images && images.length > 0) {
    return images[0];
  }

  return undefined;
}

/**
 * Extract images array, handling various formats
 */
function extractImages(record) {
  const value = record.value || record;

  for (const name of FIELD_MAPPINGS.images) {
    const imgs = value[name];
    if (!Array.isArray(imgs) || imgs.length === 0) continue;

    return imgs.map(img => {
      if (typeof img === 'string') return img;
      if (img.url) return img.url;
      if (img.thumb) return img.thumb;
      if (img.fullsize) return img.fullsize;
      if (img.$type === 'blob' || img.ref) {
        return formatBlobUrl(record, img);
      }
      return null;
    }).filter(Boolean);
  }

  return [];
}

/**
 * Format a blob URL from a blob reference
 */
function formatBlobUrl(record, blob) {
  // If it has a ref.$link (CID)
  const cid = blob.ref?.$link || blob.ref || blob.cid;
  if (!cid) return null;

  // Get the DID from the record
  const did = record.uri?.split('/')[2] || record.did;
  if (!did) return null;

  // Return CDN URL
  return `https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${cid}@jpeg`;
}

/**
 * Extract and format date
 */
function extractDate(record) {
  const value = record.value || record;

  for (const name of FIELD_MAPPINGS.date) {
    const dateVal = value[name];
    if (!dateVal) continue;

    // Try to parse as date
    const date = new Date(dateVal);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return undefined;
}

/**
 * Extract tags/labels
 */
function extractTags(record) {
  const value = record.value || record;

  for (const name of FIELD_MAPPINGS.tags) {
    const tags = value[name];
    if (Array.isArray(tags)) {
      return tags.map(t => (typeof t === 'string' ? t : t.name || t.tag || t.val)).filter(Boolean);
    }
  }

  return [];
}

/**
 * Get a human-readable type name from a lexicon $type
 */
export function getTypeName(type) {
  if (!type) return 'Unknown';

  // Extract the last part of the lexicon name
  const parts = type.split('.');
  const last = parts[parts.length - 1];

  // Convert camelCase to Title Case
  return last
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

export interface LayoutSuggestion {
  layout: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Determine the best layout for a record based on its fields.
 * Returns both a layout suggestion and a confidence score.
 *
 * Confidence levels:
 * - high: Known lexicon or clear field matches
 * - medium: Some fields matched, reasonable guess
 * - low: Unknown lexicon with few field matches (may look odd)
 */
export function suggestLayout(record): LayoutSuggestion {
  const fields = extractFields(record);
  const isKnown = isKnownLexicon(fields.$type);

  // Count how many meaningful fields we extracted
  const fieldCount = [
    fields.title,
    fields.content,
    fields.image,
    fields.url,
    fields.date
  ].filter(Boolean).length;

  // Determine base confidence from lexicon + field extraction success
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (isKnown) {
    confidence = 'high';
  } else if (fieldCount >= 2) {
    confidence = 'medium';
  }

  // Has images prominently → image layout
  if (fields.images?.length > 0 || fields.image) {
    if (!fields.content || fields.content.length < 100) {
      return { layout: 'image', confidence };
    }
  }

  // Has URL but limited content → link layout
  if (fields.url && (!fields.content || fields.content.length < 200)) {
    return { layout: 'link', confidence };
  }

  // Has items array → list or links layout
  if (fields.items?.length > 0) {
    // Check if items are link-like
    const firstItem = fields.items[0] as Record<string, unknown>;
    if (firstItem && (firstItem.url || firstItem.href)) {
      return { layout: 'links', confidence };
    }
    return { layout: 'list', confidence };
  }

  // Long content → post layout
  if (fields.content && fields.content.length > 500) {
    return { layout: 'post', confidence };
  }

  // Short content → card layout
  return { layout: 'card', confidence };
}
