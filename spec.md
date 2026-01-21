# spores.garden

**A digital garden that goes where you go.**

spores.garden is a personal website builder powered by your AT Protocol data. Curate your records, pick layouts, customize your space.

## Quick Start

```bash
npm install
npm run dev
```

Then open one of:
- `http://localhost:5174/@your-handle.bsky.social` (path-based with handle)
- `http://localhost:5174/@did:plc:your-did-here` (path-based with DID)
- `http://localhost:5174?did=did:plc:your-did-here` (query param with DID)
- `http://localhost:5174?handle=your-handle.bsky.social` (query param with handle)

The app automatically resolves handles to DIDs using the AT Protocol identity service.

## How It Works

1. **Load ALL records** from your PDS - any lexicon
2. **Select record types** to display
3. **Map to layouts** (post, card, image, links, etc.)
4. **Customize** with themes and custom CSS
5. **Save config** to your PDS

Your content stays in your PDS. The website is just a view.

## Lexicons

- `garden.spores.site.config` - Site configuration
- `garden.spores.site.content` - Custom content blocks
- `garden.spores.item.specialSpore` - Special spore items (capture-the-flag mechanic)

## Architecture

```
Static Site → Slingshot (records) + Constellation (backlinks) → Your PDS
```

- **Slingshot**: Fast record fetching cache
- **Constellation**: Backlink indexing for flower interactions and special spore tracking
- **atcute**: OAuth for AT Protocol

## Layouts

| Layout | Best For |
|--------|----------|
| `post` | Blog posts, articles |
| `card` | Short content |
| `image` | Photos, art |
| `link` | Single link preview |
| `links` | Link tree |
| `list` | Generic list |
| `profile` | About section |
| `raw` | Custom HTML |
| `flower-bed` | Flower garden display |
| `collected-flowers` | Collected flowers display |
| `special-spore-display` | Special spore capture-the-flag display |

Layouts extract common fields (title, content, image, date, etc.) from any lexicon.

## Special Spores

Special spores are rare, gamified items that implement a capture-the-flag mechanic:

- **Rarity**: Only 1 in 10 new gardens receives a special spore (10% probability on first config)
- **Capture Mechanics**: Users can steal spores from gardens (with restrictions)
- **Backlink-Based**: All spore records reference the origin garden via backlinks, enabling full lineage tracking
- **Evolution**: Complete history of all captures is preserved and displayed chronologically

See [Special Spore Documentation](docs/special-spore.md) for detailed implementation and mechanics.

## Themes

Built-in presets: `minimal`, `dark`, `bold`, `retro`

Custom CSS supported for full control.
