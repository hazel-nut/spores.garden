# spores.garden

A personal website builder that lets you curate your AT Protocol records. Login to your PDS and build your spores garden.

## Features

- **AT Protocol Native**: Connect with your Bluesky/AT Protocol account
- **Record Curation**: Display your posts, profiles, and custom content
- **Custom Lexicons**: Uses `garden.spores.*` namespace for site configuration and content
- **Themeable**: Multiple theme presets with custom CSS support
- **Guestbook**: Visitors can sign your guestbook (stored in their repos)

## Getting Started

```bash
npm install
npm run dev
```

## Lexicons

- `garden.spores.site.config` - Site configuration (title, sections, theme)
- `garden.spores.site.content` - Custom content blocks
- `garden.spores.site.profile` - Custom profile information
- `garden.spores.guestbook.entry` - Guestbook entries

## Architecture

- `/src/components/` - Web Components (site-app, section-block, etc.)
- `/src/layouts/` - Record rendering layouts (card, post, profile, guestbook)
- `/src/records/` - AT Protocol record loading and field extraction
- `/src/themes/` - Theme engine and presets
- `/lexicons/` - AT Protocol lexicon definitions

## License

MIT
