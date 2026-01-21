# Leaflet.pub Schema Notes

## Overview
Leaflet.pub is a long-form publishing platform built on AT Protocol. It uses **block-based lexicons** for rich content publishing, distinct from simple markdown-based platforms.

## Key Characteristics

### Content Model
- **Block-based**: Content is structured as blocks (text, images, lists, links, embeds)
- **Not Markdown-only**: Unlike WhiteWind which uses simple markdown lexicons
- **Similar to**: Ghost, WordPress, or Notion in terms of content structure

### Record Types (Based on Documentation)
1. **Publications** - Top-level containers for collections of writing
2. **Posts** - Individual long-form articles/pages composed of blocks
3. **Subscriptions** - Records in user's PDS representing subscriber-publication relationships

### Storage
- All data stored on user's Personal Data Server (PDS)
- Same location as Bluesky data
- Accessible via AT Protocol firehose

### Lexicon Status
- **Experimental**: Custom lexicons, still being refined
- **Interoperability**: Developers working toward shared standards with other long-form apps (e.g., Offprint)
- **Namespace**: Likely `pub.leaflet.*` format (reverse-DNS), but exact NSID not found in public docs

## Actual Schema Structure (Found!)

Based on actual leaflet.pub records, here's the schema:

### Document Type
- **NSID**: `pub.leaflet.document`
- **Root Fields**:
  - `$type`: `"pub.leaflet.document"`
  - `title`: string
  - `author`: DID string
  - `publishedAt`: ISO date string
  - `tags`: string[]
  - `description`: string (optional)
  - `coverImage`: blob reference
  - `publication`: AT URI reference
  - `postRef`: Reference to Bluesky post (with CID, URI, commit, validationStatus)
  - `pages`: array of page objects

### Page Structure
- **Type**: `pub.leaflet.pages.linearDocument`
- Contains: `blocks` array

### Block Types

1. **Text Block** (`pub.leaflet.blocks.text`)
   - `plaintext`: string
   - `facets`: array of formatting facets (optional)

2. **Header Block** (`pub.leaflet.blocks.header`)
   - `level`: number (1-6)
   - `plaintext`: string
   - `facets`: array (optional)

3. **Image Block** (`pub.leaflet.blocks.image`)
   - `image`: blob reference with `$type: "blob"`, `ref.$link` (CID), `mimeType`, `size`
   - `aspectRatio`: `{ width, height }`

4. **Unordered List** (`pub.leaflet.blocks.unorderedList`)
   - `children`: array of list items
   - List items (`pub.leaflet.blocks.unorderedList#listItem`):
     - `content`: text block
     - `children`: nested list items (optional)

5. **Horizontal Rule** (`pub.leaflet.blocks.horizontalRule`)
   - No additional fields

### Rich Text Facets
Facets apply formatting to text ranges:
- `index`: `{ byteStart, byteEnd }`
- `features`: array of formatting types
  - `pub.leaflet.richtext.facet#bold`
  - `pub.leaflet.richtext.facet#italic`

### Blob References
Images use blob references:
```json
{
  "$type": "blob",
  "ref": {
    "$link": "bafkreic764fy4nqicyrmbedizi5htrjjbslwzdjvpo2hvyz4cd5qw4wknu"
  },
  "mimeType": "image/png",
  "size": 4105254
}
```

## Implementation Notes

### Current Layout Implementation
Our `src/layouts/leaflet.ts` now handles:
- ✅ Block-based content rendering
- ✅ All major block types (text, header, image, list, horizontal rule)
- ✅ Rich text facets (bold, italic)
- ✅ Blob image references
- ✅ Title, date, tags extraction
- ✅ Cover image display
- ✅ Links back to original leaflet.pub article

### Implementation Details
1. **Block Rendering**: Fully implemented with proper handling of nested structures
2. **Field Mapping**: Complete schema mapping in field-extractor.ts
3. **Collection Name**: `pub.leaflet.document` (confirmed)
4. **Block Types**: All major types implemented

## Resources
- Leaflet Lab Notes on Lexicons: https://lab.leaflet.pub/3lxy5sg373k2z
- Leaflet Manual: https://about.leaflet.pub/
- AT Protocol Lexicon Guide: https://atproto.com/guides/lexicon

## Next Steps
1. When leaflet.pub records are encountered, inspect actual record structure
2. Update field extractor to properly handle block-based content
3. Enhance layout to render block types appropriately
4. Consider adding support for block-based rendering if content structure requires it
