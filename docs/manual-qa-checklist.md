# Manual Browser QA Checklist

Use this checklist for release-candidate validation in real browsers before launch.

## Test Matrix

- [ ] Chromium
- [ ] Firefox
- [ ] Safari/WebKit
- [ ] Mobile viewport (phone width)

## 1) Home and Routing

- [ ] Open `/` while logged out: page loads and Connect button is visible.
- [ ] Open `/@<valid-handle>`: handle resolves and URL remains canonical `@handle`.
- [ ] Open `/@did:plc:<did>`: garden preview/shell renders.
- [ ] Open `/@<invalid-handle>`: redirect to `/` and handle-not-found notice appears.
- [ ] Dismiss notification and confirm it stays dismissed.

## 2) Authentication

- [ ] Login modal opens from home page.
- [ ] Login modal closes without side effects.
- [ ] Complete login flow and verify logged-in UI state.
- [ ] Logout and verify logged-out UI state.
- [ ] Session-expired flow shows expected re-auth notification.

## 3) Owner vs Visitor Permissions

- [ ] Owner on own garden sees editor controls.
- [ ] Visitor on someone else's garden does not see owner-only controls.
- [ ] Switching routes between owner and non-owner gardens updates controls correctly.

## 4) Edit and Save Flows

- [ ] Update site title/subtitle and save.
- [ ] Refresh page and confirm updates persist.
- [ ] Add a section, reorder it, remove it, save, and refresh.
- [ ] Edit existing content/profile data and confirm persistence after refresh.
- [ ] Save operations complete with no console errors.

## 5) Profile and Media

- [ ] Profile fields render and save correctly (including pronouns if present).
- [ ] Avatar/banner upload path works and persists after refresh.
- [ ] Missing profile record fallback still renders usable output.

## 6) Layout Rendering

- [ ] `post` renders expected fields.
- [ ] `card` renders expected fields.
- [ ] `image` renders expected fields.
- [ ] `profile` renders expected fields.
- [ ] `list`/`links` render expected fields.
- [ ] `leaflet` layout renders sample content correctly.
- [ ] `smoke-signal` layout renders sample content correctly.
- [ ] Unknown or partial records do not crash rendering.

## 7) Special Spore and Flowers

- [ ] Special spore section loads without errors.
- [ ] Capture action succeeds in valid state.
- [ ] Cooldown blocks immediate repeat capture as expected.
- [ ] Future-timestamp guardrail rejects invalid capture records.
- [ ] Flower interactions render and update correctly.

## 8) NSID Rollout Validation

Pre-rollout:
- [ ] With `VITE_NSID_MIGRATION_ENABLED=false`, app behavior remains stable.

Rollout/staging:
- [ ] With `VITE_NSID_MIGRATION_ENABLED=true`, owner migration runs for owner session.
- [ ] Migration marker is set and repeat load is idempotent.
- [ ] Post-migration garden still renders and saves correctly.

## 9) Non-Functional Checks

- [ ] No uncaught runtime exceptions in console during critical flows.
- [ ] No persistent request-failure loops in network panel.
- [ ] Initial page load and key route transitions are acceptable for launch.

## 10) Signoff

- [ ] QA notes captured and attached to release/PR.
- [ ] Any failures triaged with severity and owner.
- [ ] Go/No-Go decision recorded.
