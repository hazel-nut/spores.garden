# Rollback And Incident Playbook

This playbook defines quick-response actions for launch and post-launch incidents.

## Severity Levels

- `sev-1`: app unusable for most users, data corruption risk, or auth-wide outage.
- `sev-2`: major feature degraded, partial outage, migration failures affecting many users.
- `sev-3`: isolated bugs or cosmetic issues with workaround.

## First 10 Minutes (Any Incident)

1. Freeze deploys and merges to `main`.
2. Capture scope: impacted routes, user types, and start time.
3. Assign one incident lead and one scribe.
4. Start an incident log with timestamps and actions taken.

## Rollback Levers

### 1) NSID rollout control (highest leverage)

File: `src/config/nsid.ts`

- Emergency disable migration/write-new behavior:
  - set `nsidMigrationEnabled = false`
- Effect:
  - write path returns to old namespace
  - reads remain compatible with old namespace

Use this if:
- owner migrations fail repeatedly
- new namespace records appear malformed or missing
- unexpected write regressions occur after cutover

### 2) App deploy rollback

- Redeploy previous known-good artifact/tag.
- Confirm static assets are rolled back (`index` + JS bundles + `.well-known` output).

Use this if:
- recent UI/runtime changes introduced critical regressions
- rollback flag alone is insufficient

### 3) DNS / Lexicon authority rollback

- Revert `_lexicon` DNS TXT changes only if resolution itself is broken.
- Prefer app-level rollback first (faster and lower blast radius).

Use this if:
- authoritative DID resolution is incorrect
- resolvers cannot fetch expected lexicons

## Verification Checklist After Rollback

1. Home page loads.
2. `@handle` route resolves correctly.
3. `did:plc` route renders expected garden.
4. Edit/save works for owner accounts.
5. Special spore interactions still function.
6. No new migration errors are appearing in logs.

## Communication Template

- Status: `Investigating` / `Mitigated` / `Resolved`
- User impact summary
- Start time (UTC)
- Current mitigation
- Next update time

## Post-Incident Actions

1. Publish timeline and root cause.
2. Add regression test(s) for the failure mode.
3. Update `docs/release-checklist.md` if process changes are needed.
