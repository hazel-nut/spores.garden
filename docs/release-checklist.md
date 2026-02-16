# Release Checklist

Use this checklist before promoting a release to production.

## 1) Code Health

- `npm run typecheck:strict` passes.
- `npm run test:run` passes.
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

- `src/config/nsid.ts` rollout flag reviewed:
  - `nsidMigrationEnabled = false` for pre-rollout
  - `nsidMigrationEnabled = true` for migration rollout
- Owner migration behavior validated in staging.

## 4) Documentation

- `readme.md` matches current runtime behavior.
- `docs/nsid-migration.md` reflects current rollout plan.
- New/changed features are documented under `docs/`.

## 5) Release

- Tag release commit.
- Deploy artifacts.
- Smoke test:
  - Home page
  - `@handle` route
  - `did:plc` route
  - Edit/save flow
  - Special spore interactions
