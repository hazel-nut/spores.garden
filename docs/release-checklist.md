# Release Checklist

Use this checklist before promoting a release to production.

## 1) Code Health

- `npm run typecheck:strict` passes.
- `npm run test:run` passes.
- `npm run test:e2e` passes (when Playwright is configured in environment).
- `npm run build` passes.
- No unresolved merge conflicts.

## 2) NSID Readiness

- `coop.hypha.spores.*` lexicons are published in the authoritative DID repo.
- `_lexicon` DNS TXT records are set for:
  - `_lexicon.site.spores.hypha.coop`
  - `_lexicon.content.spores.hypha.coop`
  - `_lexicon.social.spores.hypha.coop`
  - `_lexicon.item.spores.hypha.coop`
- NSID resolution is verified from external clients.

## 3) App Rollout Controls

- `VITE_NSID_MIGRATION_ENABLED` deployment setting reviewed:
  - unset / `false` for pre-rollout
  - `true` for migration rollout
- Owner migration behavior validated in staging.

## 4) Documentation

- `readme.md` matches current runtime behavior.
- `docs/nsid-migration.md` reflects current rollout plan.
- New/changed features are documented under `docs/`.

## 5) Release

- Execute day-of steps from `docs/launch.md`.
- Execute manual browser QA from `docs/manual-qa-checklist.md`.
- Tag release commit.
- Deploy artifacts.
- Smoke test:
  - Home page
  - `@handle` route
  - `did:plc` route
  - Edit/save flow
  - Special spore interactions
