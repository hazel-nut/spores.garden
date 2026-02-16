# Launch Runbook

This runbook is the day-of-launch execution guide for spores.garden.

## 1. Preconditions (Before Launch Day)

- `docs/release-checklist.md` is fully complete.
- `npm run check` is green on the release commit.
- NSID authority plan is validated (`docs/nsid-migration.md`).
- Rollback owner is assigned and `docs/rollback-playbook.md` is reviewed.

## 2. Freeze Window

1. Freeze merges to `main` except launch blockers.
2. Confirm release commit SHA.
3. Tag release candidate and final release tags.
4. Announce launch window and communications owner.

## 3. Production Cutover Steps

1. Deploy the release artifact.
2. Verify static output includes `.well-known/atproto-lexicons`.
3. Confirm production routes:
   - `/`
   - `/@<handle>`
   - `/@did:plc:<did>`
4. Validate owner login + edit/save flow.
5. Validate non-owner read-only flow.

## 4. NSID Rollout Steps

If NSID migration is part of this launch:

1. Confirm `coop.hypha.spores.*` lexicons are published.
2. Confirm `_lexicon` TXT records resolve publicly for all authority groups.
3. Enable migration switch in `src/config/nsid.ts` as planned.
   - deployment env: `VITE_NSID_MIGRATION_ENABLED=true`
4. Validate owner migration on a staging DID and one production canary DID.
5. Monitor migration success/errors before full ramp.

If DNS is not ready, keep migration disabled and launch app changes only.

## 5. Post-Deploy Verification (First 60 Minutes)

1. Smoke test top user journeys every 15 minutes:
   - anonymous visit
   - handle route load
   - DID route load
   - owner edit/save
   - special spore interaction
2. Monitor for:
   - auth/session restore failures
   - migration failures
   - client runtime errors
3. Record findings and timestamps in launch log.

## 6. Rollback Criteria

Trigger rollback immediately if any condition is met:

- widespread auth failure
- owner save flow broken
- migration errors are sustained and user-impacting
- severe route-level outage

Execute rollback via `docs/rollback-playbook.md`.

## 7. Completion Criteria

Launch can be declared successful when:

- no sev-1 or sustained sev-2 incidents in first hour
- core journeys are stable
- migration behavior matches rollout plan
- release notes and status update are published
