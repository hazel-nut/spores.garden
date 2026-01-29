# Commit notes: Spore UI refactor (floating badge → modal + header)

**Branch:** `feature/spore-ui-refactor`  
**Reminder:** what changed in this commit.

---

## Summary

- **Removed** the floating `<spore-badge>` component. Spore display and steal UI moved into the **spore details modal** and **header**.
- **Extracted** spore logic (`findAllHeldSpores`, `findSporeByOrigin`, `stealSpore`) into `src/utils/special-spore.ts`. Shared by site-renderer (header) and spore-modal (steal).
- **Spore modal** now shows lineage + “Held by” / “Capture the spore!” (steal) when applicable. Modal opens immediately with “Loading lineage…”, then hydrates.
- **Header**: home button shows **owner’s monochrome spore flower** on garden pages (not home). Spore flowers in header use new `.header-spores` styling (align, nudge).
- **Take a seed** button only rendered when the visitor has *not* already collected; “Already collected” case no longer shows a disabled button.
- **Flower-bed “Visit garden”** CTAs: current-page gardens show a **disabled button** (no self-link); others stay as links. Refactored via `createGardenLink` / `createDisabledGardenButton`.
- **Theme/UI**: `--color-border-muted`, palette-based primary/accent in `colors.ts`, `button-secondary` uses `--color-text-muted` + `--color-border-muted`. Header padding tweaks, dandelion/monochrome-spore-flower hover invert. Header-strip padding and mobile `.header-spores` adjustments.
- **New**: `generateMonochromeSporeFlowerSVGString` in `flower-svg.ts` for header home icon on garden pages; `scripts/preview-colors.ts` + `npm run preview:colors` for color palette preview.
- **Docs**: `special-spore.md` updated to describe modal + `special-spore.ts` instead of the old badge.

## Files changed

| Change | Path |
|--------|------|
| Modified | `docs/special-spore.md` |
| Modified | `package.json` (add `preview:colors` script) |
| Modified | `src/components/site-renderer.ts` |
| Deleted | `src/components/spore-badge.ts` |
| Modified | `src/components/spore-modal.ts` |
| Modified | `src/layouts/flower-bed.ts` |
| Modified | `src/themes/base.css` |
| Modified | `src/themes/colors.ts` |
| Modified | `src/utils/flower-svg.ts` |
| New | `scripts/preview-colors.ts` |
| New | `src/utils/special-spore.ts` |
| New | `docs/COMMIT-NOTES-spore-refactor.md` (this file) |

## Quick reference

- **Spore display:** header (owner’s spores) + flower bed. Open spore → modal (lineage + steal).
- **Steal:** only in modal, when logged in and not current holder. Uses `stealSpore` from `special-spore.ts`.
- **Home icon:** dandelion on `/`; monochrome spore flower on `/@handle` pages.
