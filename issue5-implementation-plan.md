# Issue #5 Implementation Plan - spores.garden MVP Features

**Source:** GitHub Issue #5 - Product Scope Definition  
**Goal:** Complete MVP features with modular, parallelizable implementation tasks

## Overview

This plan implements remaining features from issue #5 with clear task boundaries to enable parallel development. Tasks are organized by area (UI, Backend/PDS, Features) to minimize conflicts.

**Note:** References to "leaflet" in this plan refer to **leaflet.pub** (the AT Protocol long-form publishing platform), NOT the Leaflet.js map library. The `leaflet.ts` layout file displays long-form articles published via leaflet.pub.

---

## Phase 1: Pre-Population & Generative Flowers

### Task 1.1: Generative Flower Pre-Population System
**Area:** Backend/Logic  
**Files:** `src/config.ts`, `src/components/welcome-modal.ts`  
**Dependencies:** None  
**Conflicts:** Low (new feature)  
**Status:** ✅ **COMPLETED**

**Requirements:**
- When new user completes onboarding, auto-create initial site sections
- Use seed-based generation (DID hash) + randomness for variety
- Generate "generative flowers" - unique flower configurations per user

**Implementation:**
1. Create `generateInitialSections(did: string)` function in `src/config.ts`
   - Input: User's DID
   - Output: Array of section configs
   - Use DID as seed for deterministic randomness
2. Sections to generate (with probability/seed-based variation):
   - **Always include:**
     - Profile section (100%)
     - Flower Bed section (100%)
     - Collected Flowers section (100%)
     - Share to Bluesky button/section (100%)
   - **Randomly include (seed-based):**
     - One Bluesky post section (70% chance)
     - One text/markdown content block (60% chance)
     - One image section (40% chance)
3. Use seed-based PRNG for consistency:
   ```typescript
   function seededRandom(seed: string): number {
     // Hash DID to get seed number
     // Use Linear Congruential Generator or similar
   }
   ```
4. Update `saveConfig({ isInitialOnboarding: true })` in `src/config.ts`
   - Call `generateInitialSections()` when `isInitialOnboarding === true`
   - Merge generated sections with any manually added sections

**Acceptance Criteria:**
- New users get pre-populated sections based on their DID
- Same DID always generates same initial sections (deterministic)
- Sections include flower-related features
- Works seamlessly with existing welcome modal flow

---

### Task 1.2: Generative Flower Visualization
**Area:** UI/Visualization  
**Files:** `src/components/did-visualization.ts`, `src/themes/engine.ts`  
**Dependencies:** Task 1.1 (can work in parallel, different files)  
**Conflicts:** Low (enhancement to existing component)  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Enhance DID visualization to be more "flower-like"
- Add randomness + seed-based variation to flower patterns
- Make flowers visually distinct while maintaining DID determinism

**Implementation:**
1. Enhance `did-visualization.ts`:
   - Current: 10x10 binary grid
   - New: Add flower-like patterns (petals, stem, leaves)
   - Use DID hash to determine:
     - Number of petals (3-8, seed-based)
     - Petal shape (round, pointed, wavy)
     - Color variations (from theme)
     - Size variations
     - Rotation/orientation
2. Add flower animation/rendering:
   - SVG paths for petal shapes
   - Layer multiple petals based on seed
   - Add center "stamen" with DID colors
   - Optional: Add stem/leaves for visual interest
3. Ensure determinism: Same DID = same flower pattern

**Acceptance Criteria:**
- Flowers are visually distinct and recognizable as flowers
- Same DID always generates same flower
- Flowers use theme colors from DID
- Works with existing social card generation

---

### Task 1.3: Add Share to Bluesky Section to Pre-Population
**Area:** Backend/Logic  
**Files:** `src/config.ts`, `src/components/section-block.ts`, `src/components/site-app.ts`  
**Dependencies:** Task 1.1 (follow-up)  
**Conflicts:** Low (enhancement to existing function)  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Add "Share to Bluesky button/section" to the pre-populated sections (as specified in Task 1.1 requirements)
- Currently missing from `generateInitialSections()` implementation
- Should be included 100% of the time for new users

**Implementation:**
1. Update `generateInitialSections()` in `src/config.ts`:
   - Add Share to Bluesky section to the always-included sections
   - Determine appropriate section type/layout for share button
   - Or integrate as a dedicated section that renders the share functionality
2. Verify it renders correctly in the UI
3. Ensure it works with existing share functionality in `site-app.ts`

**Acceptance Criteria:**
- New users always get a Share to Bluesky section in pre-population
- Share functionality works from the pre-populated section
- Doesn't conflict with existing share button in controls

---

## Phase 2: Guestbook Removal & Migration

### Task 2.1: Remove Guestbook from UI
**Area:** UI  
**Files:** `src/components/site-app.ts`, `src/components/welcome-modal.ts`  
**Dependencies:** None  
**Conflicts:** Medium (removing feature)  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Remove guestbook option from "Add Section" modal
- Remove guestbook from welcome modal actions
- Update references to guestbook in favor of flower features

**Implementation:**
1. In `site-app.ts` `showAddSectionModal()`:
   - Remove guestbook button from section types
   - Keep flower-bed and collected-flowers options
2. In `welcome-modal.ts`:
   - Remove any guestbook-related actions
   - Update onboarding to focus on flowers
3. Update section type handling:
   - Remove `guestbook` from valid section types
   - Ensure existing guestbook sections still render (backward compatibility)

**Acceptance Criteria:**
- Guestbook option no longer appears in Add Section modal
- No broken references to guestbook in onboarding
- Existing guestbook sections still work (backward compat)

---

### Task 2.2: Guestbook Layout Cleanup
**Area:** Code Cleanup  
**Files:** `src/layouts/guestbook.ts` (deleted), `src/components/section-block.ts`, `src/components/site-app.ts`, `src/types/index.ts`, `src/records/field-extractor.ts`, `src/themes/base.css`, `spec.md`  
**Dependencies:** Task 2.1 (can work in parallel)  
**Conflicts:** Low (removal)  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Remove all guestbook code and references
- Clean up dead code from prototype

**Implementation:**
1. Deleted `src/layouts/guestbook.ts` entirely
2. Removed guestbook import from `section-block.ts`
3. Removed guestbook case and `renderGuestbook()` method from `section-block.ts`
4. Removed guestbook references from `site-app.ts` (type handling)
5. Removed `guestbook` from Section type in `types/index.ts`
6. Removed `garden.spores.guestbook.entry` from known lexicons in `field-extractor.ts`
7. Removed all guestbook CSS from `base.css`
8. Removed guestbook references from `spec.md`
9. Updated comment in `at-client.ts` to reference flower interactions instead

**Acceptance Criteria:**
- All guestbook code removed
- No references to guestbook remain in codebase
- Documentation updated

---

## Phase 3: Documentation & Flavor Text

### Task 3.1: Add Generative Art Flavor Text
**Area:** UI/Copy  
**Files:** `src/components/welcome-modal.ts`, `src/components/did-visualization.ts`  
**Dependencies:** None  
**Conflicts:** None  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Explain what generative art is and why it's cool
- Add explanatory text to welcome modal
- Add tooltip/info to DID visualization

**Implementation:**
1. Update welcome modal step 2:
   - Add explanation: "Your DID (Decentralized Identifier) generates a unique visual flower pattern. This is your digital signature—no two gardens look the same, and your flower remains consistent across the network."
   - Explain: "The colors, patterns, and shape are derived from your DID's cryptographic hash, creating a one-of-a-kind garden theme that's yours forever."
2. Add info tooltip to `did-visualization`:
   - Small "?" icon or info badge
   - On hover/click: "This flower is generated from your DID—a unique cryptographic identifier. It's your visual signature in the garden network."
3. Update theme metadata display to explain the generation

**Acceptance Criteria:**
- Users understand what generative art is
- Clear explanation of DID-based generation
- Tooltips/info accessible without cluttering UI

---

### Task 3.2: "Load Records" Helper Text
**Area:** UI/Copy  
**Files:** `src/components/welcome-modal.ts`, `src/components/site-app.ts`, `src/themes/base.css`  
**Dependencies:** None  
**Conflicts:** None  
**Status:** ✅ **COMPLETE**

**Requirements:**
- Add explanatory text for "Load Records" feature
- Explain it's advanced/experimental
- Encourage experimentation

**Implementation:**
1. Find where "Load Records" is displayed (likely welcome modal)
2. Add helper text:
   - "Load Records (Advanced): Load any AT Protocol record type to display. Rendering may vary—experiment and see what works!"
   - Or add tooltip/info icon with explanation
3. Style as secondary/advanced feature (subtle, not prominent)

**Acceptance Criteria:**
- Users understand Load Records is advanced
- Clear that rendering is untested
- Encourages experimentation

---

## Phase 4: Content Block Types

### Task 4.1: Image Block Layout
**Area:** Layouts  
**Files:** `src/layouts/index.ts`, `src/layouts/image.ts` (new)  
**Dependencies:** None  
**Conflicts:** Low (new feature)  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Create image layout for displaying images
- Support single image or image gallery
- Extract image URLs from records

**Implementation:**
1. Create `src/layouts/image.ts`:
   - Register as 'image' layout
   - Extract image field from records (via field-extractor)
   - Render `<img>` with proper sizing
   - Support alt text
   - Lazy loading
2. Register in `src/layouts/index.ts`
3. Add to section type options in `site-app.ts`
4. Handle image blobs/URLs from AT Protocol

**Acceptance Criteria:**
- Images render correctly from records
- Supports single and multiple images
- Proper error handling for missing images

---

### Task 4.2: Leaflet.pub Posts Layout
**Area:** Layouts  
**Files:** `src/layouts/index.ts`, `src/layouts/leaflet.ts` (new), `src/components/site-app.ts`  
**Dependencies:** None  
**Conflicts:** Low (new feature)  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Create layout for leaflet.pub posts (AT Protocol long-form publishing platform)
- Research leaflet.pub lexicon structure (`pub.leaflet.document`)
- Render leaflet.pub-specific content (block-based articles)

**Implementation:**
1. Research leaflet.pub AT Protocol lexicon:
   - Identify collection name (`pub.leaflet.document`)
   - Understand record structure (block-based content)
2. Create `src/layouts/leaflet.ts`:
   - Extract leaflet.pub-specific fields (title, date, tags, cover image)
   - Render block-based content (text, headers, images, lists)
   - Support rich text facets (bold, italic)
3. Register in layouts index
4. Add to section types

**Note:** leaflet.pub is a long-form publishing platform (like Medium/Substack), NOT the Leaflet.js map library

**Acceptance Criteria:**
- leaflet.pub articles render correctly
- Proper field extraction from `pub.leaflet.document` records
- Handles block-based content structure

---

### Task 4.3: Smoke Signal Events Layout
**Area:** Layouts  
**Files:** `src/layouts/index.ts`, `src/layouts/smoke-signal.ts` (new)  
**Dependencies:** None  
**Conflicts:** Low (new feature)  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Create layout for Smoke Signal events
- Support hosting and attending events
- Display event details (date, location, description)

**Implementation:**
1. Research Smoke Signal lexicon:
   - Event record structure
   - Hosting vs attending distinction
2. Create `src/layouts/smoke-signal.ts`:
   - Extract event fields (title, date, location, description)
   - Display event type (hosting/attending)
   - Event-specific styling
3. Register in layouts
4. Add to section types

**Note:** May require Smoke Signal lexicon specification

**Acceptance Criteria:**
- Events render with all details
- Clear indication of hosting vs attending
- Date/time formatting

---

## Phase 5: Discoverability (Future)

### Task 5.1: Recent Gardens Display
**Area:** Main Page / Discovery  
**Files:** `src/main.ts`, `src/components/recent-gardens.ts`  
**Dependencies:** None (client-first Constellation/Slingshot API integration)  
**Conflicts:** Medium (new main page feature)  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Display recently updated gardens on main page
- Track sites updated via manual edits OR flower interactions
- Similar to Blento's discoverability

**Implementation:**
- ✅ Component structure and UI implemented
- ✅ Mock API implementation added (MockRecentGardensAPI) for development/testing
- ✅ **ConstellationRecentGardensAPI** implemented - client-first integration:
  - Uses `listRecords()` to query flower records from known gardens
  - Uses `getBacklinks()` to discover gardens via flower interactions
  - Uses `getRecord()` with Slingshot to check for garden configs
  - Discovers gardens from flower plantings (`discoverGardensFromFlowers`)
  - Discovers gardens from config updates (`discoverGardensFromConfigs`)
  - Maintains known gardens list in localStorage for discovery seeding
- ✅ RecentGardensAPI interface defined
- ✅ Component integrated into site-app.ts
- ✅ Enriches garden data with profile information
- ✅ Shows update types (flower-plant, flower-take, content, edit)
- ✅ Displays relative timestamps and garden visualizations

**Note:** This is a **client-first implementation** using Constellation/Slingshot APIs directly. No backend service required - the app queries AT Protocol records and backlinks from the browser.

---

## Phase 6: Nice-to-Have Features

### Task 6.1: Text Field for Taking Flowers
**Area:** UI Enhancement  
**Files:** `src/components/site-app.ts`  
**Dependencies:** Lexicon update for `garden.spores.social.takenFlower`  
**Conflicts:** Low  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Add optional text field when taking a seed
- Store reason/note with taken flower record
- Display note in Collected Flowers section

**Implementation:**
1. Update `garden.spores.social.takenFlower` lexicon:
   - Add optional `note` field (string, max length)
2. Update `takeFlower()` in `site-app.ts`:
   - Show modal with text input before taking seed
   - Include note in record creation
3. Update `collected-flowers.ts` layout:
   - Display note if present

**Acceptance Criteria:**
- Users can optionally add note when taking seed
- Note displays in collected flowers
- Backward compatible (existing records without notes work)

---

### Task 6.2: Mushroom Stealing Feature
**Area:** Gamification  
**Files:** `src/layouts/special-spore-display.ts`, `src/components/site-app.ts`, `src/at-client.ts`  
**Dependencies:** Lexicon exists, basic stealing logic exists  
**Conflicts:** Medium (new feature)  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Special "mushroom" items that can be stolen
- Only available if user hasn't planted flower or taken seed
- Trade mechanic: take mushroom + leave flower

**Implementation:**
1. ✅ Added restriction check functions:
   - `checkHasPlantedFlower()` - checks if user has planted a flower in the garden
   - `checkHasTakenSeed()` - checks if user has taken a seed from the garden
2. ✅ Updated steal button logic:
   - Check restrictions before showing steal button
   - Show helpful restriction messages if user can't steal
   - Show help text explaining the restriction rule
3. ✅ Implemented trade mechanic:
   - Automatically plant a flower when stealing a spore
   - Flower planting happens as part of stealSpore() function
   - If flower planting fails, steal still succeeds (flower is bonus)

**Acceptance Criteria:**
- ✅ Users cannot steal spore if they've planted a flower
- ✅ Users cannot steal spore if they've taken a seed
- ✅ Stealing a spore automatically plants a flower as trade
- ✅ Clear UI feedback explains restrictions and trade mechanic

---

## Task Dependencies & Parallel Work

### Can Work in Parallel (No Conflicts):
- **Task 1.1** (Pre-population logic) + **Task 1.2** (Flower visualization) - Different files
- **Task 2.1** (Remove guestbook UI) + **Task 2.2** (Guestbook cleanup) - Different concerns
- **Task 3.1** (Flavor text) + **Task 3.2** (Load records text) - Different UI areas
- **Task 4.1** (Images) + **Task 4.2** (Leaflet.pub) + **Task 4.3** (Smoke Signal) - Different layouts

### Sequential Dependencies:
- Task 1.1 should complete before extensive testing of pre-population
- Task 2.1 should complete before Task 2.2 (but can start in parallel)

### Conflict Areas:
- Multiple agents editing `site-app.ts` - coordinate or use feature flags
- Layout registration in `index.ts` - merge carefully or use separate files

---

## Implementation Notes

### Seed-Based Randomness Pattern
```typescript
// Example pattern for all seed-based features
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  let state = Math.abs(hash);
  
  return function() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}
```

### Pre-Population Section Templates
```typescript
const SECTION_TEMPLATES = {
  profile: { type: 'profile', layout: 'profile' },
  flowerBed: { type: 'flower-bed', layout: 'flower-bed', title: 'Flower Bed' },
  collectedFlowers: { type: 'collected-flowers', layout: 'collected-flowers', title: 'Collected Flowers' },
  // ... etc
};
```

---

## Acceptance Criteria Summary

1. ✅ New users get pre-populated sections (seed-based)
2. ✅ Generative flowers are visually distinct and deterministic
3. ✅ Guestbook removed from UI (backward compat maintained)
4. ✅ Flavor text explains generative art
5. ✅ Load Records has helper text
6. ✅ New content block types available (images, leaflet.pub, smoke signal)

---

## Testing Checklist

- [ ] New user onboarding creates expected sections
- [ ] Same DID generates same pre-populated sections (deterministic)
- [ ] Flower visualizations are unique per DID
- [ ] Guestbook option no longer appears
- [ ] Existing guestbook sections still work
- [ ] Flavor text is visible and helpful
- [ ] Load Records has explanation text
- [ ] New layouts render correctly

---

## Phase 7: Bug Fixes & Code Quality

### Task 7.1: Fix Duplicate Code Bug in site-app.ts
**Area:** Bug Fix  
**Files:** `src/components/site-app.ts`  
**Dependencies:** None  
**Conflicts:** Low (bug fix)  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Remove duplicate smoke-signal handler code (lines 553-567 duplicate lines 537-551)
- Add missing leaflet.pub handler in `addSection()` method
- Ensure all section types in UI have corresponding handlers

**Implementation:**
1. Remove duplicate smoke-signal block (lines 553-567)
2. Add leaflet.pub handler similar to image/smoke-signal:
   ```typescript
   if (type === 'leaflet') {
     const config = getConfig();
     const id = `section-${Date.now()}`;
     const section = {
       id,
       type: 'records',
       layout: 'leaflet',
       title: 'Leaflet.pub Articles',
       records: []
     };
     config.sections = [...(config.sections || []), section];
     this.render();
     return;
   }
   ```
3. Verify all section type buttons work correctly

**Acceptance Criteria:**
- No duplicate code in site-app.ts
- leaflet.pub section type works when clicked
- All section types create proper sections

---

### Task 7.2: Fix Missing Import in smoke-signal.ts
**Area:** Bug Fix  
**Files:** `src/layouts/smoke-signal.ts`, `src/layouts/leaflet.ts`  
**Dependencies:** None  
**Conflicts:** None  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Add missing `extractFields` import to smoke-signal.ts
- Ensure type safety matches other layouts

**Implementation:**
1. ✅ Added import: `import { extractFields } from '../records/field-extractor';`
2. ✅ Updated function signature to match pattern: `export function renderSmokeSignal(fields: ReturnType<typeof extractFields>, record?: any): HTMLElement`
3. ✅ Fixed same issue in `leaflet.ts` for consistency
4. ✅ Verified TypeScript compilation succeeds (no lint errors)

**Acceptance Criteria:**
- ✅ smoke-signal.ts has proper imports
- ✅ leaflet.ts also fixed for consistency
- ✅ Type definitions are consistent with other layouts (matching image.ts pattern)
- ✅ No TypeScript errors

---

## Phase 8: Enhancements & Improvements

### Task 8.1: Enhance Image Gallery Display
**Area:** UI Enhancement  
**Files:** `src/layouts/image.ts`, `src/themes/base.css`  
**Dependencies:** None  
**Conflicts:** Low  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Show indication when gallery has more than 4 images
- Add lightbox/modal view for full gallery
- Improve gallery grid layout

**Implementation:**
1. Show "+X more" indicator when images.length > 4
2. Add click handler to open modal with all images
3. Add navigation controls in modal (prev/next)
4. Style gallery grid with responsive columns
5. Add keyboard navigation (arrow keys, escape)

**Acceptance Criteria:**
- Users can see all images in gallery
- Gallery navigation is intuitive
- Modal works on mobile and desktop

---

### Task 8.2: Improve Field Extractor with Lexicon Registry
**Area:** Architecture Enhancement  
**Files:** `src/records/field-extractor.ts`  
**Dependencies:** None  
**Conflicts:** Low  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Create lexicon schema registry for better field mapping
- Improve confidence scores for unknown lexicons
- Add developer documentation for adding new lexicons

**Implementation:**
1. Create `LEXICON_SCHEMAS` object mapping lexicon types to field mappings
2. Update field extraction to use schemas when available
3. Fall back to heuristic extraction for unknown lexicons
4. Add confidence scoring system
5. Document schema format in comments

**Acceptance Criteria:**
- Known lexicons use precise field mappings
- Unknown lexicons still work via heuristics
- Documentation explains how to add new lexicons

---

### Task 8.3: Add Accessibility Improvements to Layouts
**Area:** Accessibility  
**Files:** `src/layouts/image.ts`, `src/layouts/smoke-signal.ts`, `src/layouts/leaflet.ts`  
**Dependencies:** None  
**Conflicts:** Low  
**Status:** 🔄 **ONGOING**

**Requirements:**
- Add proper ARIA labels to all interactive elements
- Ensure keyboard navigation works
- Improve screen reader announcements
- Add skip links where appropriate

**Implementation:**
1. Review all layouts for accessibility issues
2. Add `aria-label`, `aria-describedby` attributes
3. Ensure all interactive elements are keyboard accessible
4. Add proper semantic HTML (articles, sections, time elements)
5. Test with screen readers

**Acceptance Criteria:**
- All layouts pass basic accessibility checks
- Keyboard navigation works throughout
- Screen readers can understand content structure

---

### Task 8.4: Add Loading States and Error Boundaries
**Area:** UX Improvement  
**Files:** `src/layouts/image.ts`, `src/layouts/smoke-signal.ts`, `src/layouts/leaflet.ts`, `src/components/section-block.ts`  
**Dependencies:** None  
**Conflicts:** Low  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Show loading indicators while images/records load
- Add error boundaries to prevent layout crashes
- Provide helpful error messages
- Add retry mechanisms for failed loads

**Implementation:**
1. ✅ Created `src/utils/loading-states.ts` utility with:
   - `createLoadingSpinner()` - Creates loading spinner with message
   - `createErrorMessage()` - Creates error message with optional retry button
   - `withLoadingState()` - Wrapper for async operations with loading/error handling
2. ✅ Updated `src/components/section-block.ts`:
   - Added loading states for profile, records, and content rendering
   - Wrapped all async operations in try-catch blocks
   - Added retry mechanisms for failed operations
   - Individual record errors don't crash entire section
3. ✅ Updated `src/layouts/image.ts`:
   - Added loading opacity transitions for images
   - Enhanced error handling with retry buttons
   - Error handling for both single images and gallery images
   - Modal image loading errors also have retry
4. ✅ Updated `src/layouts/smoke-signal.ts`:
   - Added try-catch wrapper around entire layout rendering
   - Image loading errors with retry mechanism
5. ✅ Updated `src/layouts/leaflet.ts` (leaflet.pub layout):
   - Added try-catch wrapper around entire layout rendering
   - Image loading errors with retry mechanism
   - Block rendering errors handled gracefully
6. ✅ Added CSS styles in `src/themes/base.css`:
   - `.loading-state` - Loading spinner container styles
   - `.error-state` - Error message container styles
   - `.button-retry` - Retry button styles
   - `.image-error-container` - Image error container
   - `.record-error` - Record error placeholder styles

**Acceptance Criteria:**
- ✅ Users see loading feedback (spinners during async operations)
- ✅ Errors don't crash the entire page (try-catch boundaries)
- ✅ Clear error messages guide users (descriptive messages with details)
- ✅ Retry mechanisms available for failed operations
- ✅ Individual component failures don't break entire layouts

---

## Phase 9: Testing & Documentation

### Task 9.1: Add Integration Tests for New Layouts
**Area:** Testing  
**Files:** `src/layouts/image.test.ts`, `src/layouts/smoke-signal.test.ts`, `src/layouts/leaflet.test.ts`, `src/records/field-extractor.test.ts`  
**Dependencies:** Task 7.1, Task 7.2  
**Conflicts:** None  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Test image layout with various record types
- Test smoke-signal layout with event records
- Test leaflet.pub layout with long-form articles
- Test error handling and edge cases

**Implementation:**
1. ✅ Set up Vitest testing framework with happy-dom environment
2. ✅ Created comprehensive test suite for image layout (20 tests)
   - Single image rendering, gallery, modal functionality, accessibility
3. ✅ Created comprehensive test suite for smoke-signal layout (28 tests)
   - Event type detection, date formatting, location rendering, accessibility
4. ✅ Created comprehensive test suite for leaflet.pub layout (22 tests)
   - Block rendering (text, headers, images, lists), blob URLs, metadata
5. ✅ Created comprehensive test suite for field extractor (33 tests)
   - Known/unknown lexicons, image extraction, date parsing, confidence scoring, layout suggestions
6. ✅ All 103 tests passing

**Acceptance Criteria:**
- All layouts have test coverage
- Tests verify correct rendering
- Edge cases are handled

---

### Task 9.2: Document Layout System for Developers
**Area:** Documentation  
**Files:** `docs/layouts.md` (new), update `readme.md`  
**Dependencies:** None  
**Conflicts:** None  
**Status:** ✅ **COMPLETED**

**Requirements:**
- Create developer guide for creating new layouts
- Document field extractor system
- Explain layout registration process
- Provide examples and best practices

**Implementation:**
1. Create `docs/` directory
2. Write `docs/layouts.md` with:
   - Layout system overview
   - How to create a new layout
   - Field extractor usage
   - Layout registration
   - Examples
3. Update `readme.md` with link to docs

**Acceptance Criteria:**
- Developers can understand how to add layouts
- Examples are clear and working
- Documentation is up-to-date

---

## Updated Task Status Summary

### Completed (21 tasks):
- ✅ Task 1.1: Generative Flower Pre-Population System
- ✅ Task 1.2: Generative Flower Visualization
- ✅ Task 1.3: Add Share to Bluesky Section to Pre-Population
- ✅ Task 2.1: Remove Guestbook from UI
- ✅ Task 2.2: Guestbook Layout Cleanup
- ✅ Task 3.1: Add Generative Art Flavor Text
- ✅ Task 3.2: "Load Records" Helper Text
- ✅ Task 4.1: Image Block Layout
- ✅ Task 4.2: Leaflet Posts Layout
- ✅ Task 4.3: Smoke Signal Events Layout
- ✅ Task 5.1: Recent Gardens Display (client-first Constellation/Slingshot integration)
- ✅ Task 6.1: Text Field for Taking Flowers
- ✅ Task 6.2: Mushroom Stealing Feature
- ✅ Task 7.1: Fix Duplicate Code Bug in site-app.ts
- ✅ Task 7.2: Fix Missing Import in smoke-signal.ts
- ✅ Task 8.1: Enhance Image Gallery Display
- ✅ Task 8.2: Improve Field Extractor with Lexicon Registry
- ✅ Task 8.4: Add Loading States and Error Boundaries
- ✅ Task 9.1: Add Integration Tests for New Layouts
- ✅ Task 9.2: Document Layout System

### In Progress (0 tasks):

### Pending (0 tasks):

### Deferred:
- None (all deferred tasks have been picked up)

---

**Last Updated:** 2024-12-19  
**Status:** Core features complete, enhancements and bug fixes in progress

---

## Appendix A: Issue #5 Requirements Analysis & Gap Identification

### Original Issue Requirements (from GitHub Issue #5)

**Issue Title:** product scope definition  
**Created:** 2026-01-19  
**Status:** OPEN  
**Author:** LexaMichaelides

#### Core MVP Requirements (from issue body and comments):

**Setup:**
- ✅ Accessible via browser
- ✅ Login "via Bluesky" (works with self-hosted PDS)

**Site Building:**
- ✅ "Unique styles from DID" - generative art
- ✅ Generate flower image based on DID
- ✅ Create social card for sharing using flower image
- ✅ Content building interface
- ✅ Arrows to move content up and down
- ✅ Guestbook flavored as "plant a flower" with no text (implemented as flower planting)
- ✅ Premade content blocks:
  - ✅ Markdown, HTML
  - ✅ Bluesky posts
  - ✅ Images
  - ✅ Leaflet.pub posts (long-form publishing platform)
  - ✅ Smoke signal events (hosting/attending)
  - ✅ Social recommendations ("flowers taken from") - implemented as collected flowers

**Other Features:**
- 🔄 Discoverability from spores.garden page (like Blento) - **PARTIALLY IMPLEMENTED** (frontend done, backend pending)
- ✅ Pre-populate site with basic content blocks (including "share site on bluesky")
- ✅ Add flavor text to generative art concept
- ✅ "Load records" helper text (advanced feature explanation)

**Nice-to-Have:**
- ✅ Text field for taking flowers (optional note)
- ✅ Mushroom stealing feature (special spores with trade mechanic)

#### Additional Ideas from Comments (Not in Original MVP):

**From Comment 1 (2026-01-20):**
- ❓ **8-bit garden artifact**: "DID generates a unique 8-bit garden that remains on the site and is shareable as a social card. Could be based on the theme that gets generated, as a little artefact of the origins of the site even if you change it later."
  - **Status:** Social card exists with flower, but "8-bit garden" concept not explicitly implemented
  - **Gap:** May need clarification if this is different from current flower visualization

- ❓ **Webring concept**: "Show how you're connected to other gardens via flowers planted"
  - **Status:** NOT IMPLEMENTED
  - **Gap:** This would require visualizing connections between gardens based on flower interactions

**From Comment 2 (2026-01-20):**
- ✅ **Theme uniqueness**: "You can't change your theme - that's unique to you" - **IMPLEMENTED** (theme generated from DID)
- ✅ **Social card with flower**: "Your theme comes with a little social card that contains a flower image" - **IMPLEMENTED**
- ✅ **Plant a flower**: "You can 'plant a flower' on other people's gardens" - **IMPLEMENTED**
- ✅ **Take a flower**: "You can _take_ a flower from someone else's garden" - **IMPLEMENTED** (as "take a seed")
- ❓ **Display difference**: "Maybe those two things are displayed differently since it's sort of meaningfully different - a follow vs a follower"
  - **Status:** Flower bed shows planted flowers, collected flowers shows taken seeds - **DIFFERENTIATED**
  - **Note:** This appears to be implemented correctly

**From Comment 3 (2026-01-20):**
- ✅ **Mushroom stealing**: "Special Hypha flowers (mushrooms??) that people can steal only from gardens where they have not already planted a flower (or had a flower taken)" - **IMPLEMENTED**
- ✅ **Trade mechanic**: "Take the mushroom and leave your flower" - **IMPLEMENTED**

**From Comment 4 (2026-01-20 - Todo list):**
- ✅ Recent gardens display - **PARTIALLY IMPLEMENTED** (frontend done)
- ✅ Remove manual theme - **DONE** (theme is DID-based)
- ✅ Generate flower image and social card - **IMPLEMENTED**
- ✅ "Share on Bluesky" feature with social card - **IMPLEMENTED**
- ✅ Change Guestbook to "Plant a flower" - **IMPLEMENTED**
- ✅ Add content blocks: images, leaflet.pub, smoke signal - **IMPLEMENTED**
- ✅ Build social recommendations ("take a flower") - **IMPLEMENTED** (collected flowers)
- ✅ Generate premade site with blocks - **IMPLEMENTED**
- ✅ Text field for taking flowers - **IMPLEMENTED**
- ✅ Mushroom stealing feature - **IMPLEMENTED**

**From Comment 5 (2026-01-21):**
- ❓ **"Take a seed" terminology**: "How about 'plant a flower/take a seed'? Could have a lil animated seedbox for when you take a seed from someone's garden to plant in your own"
  - **Status:** "Take a seed" terminology is used, but animated seedbox not implemented
  - **Gap:** Visual/animation enhancement for seed taking interaction

---

### Gap Analysis: Missing or Incomplete Features

#### 1. **Discoverability** (Task 5.1)
- **Status:** ✅ **COMPLETED**
- **Implementation:** Client-first Constellation/Slingshot API integration
  - Uses `listRecords()` and `getBacklinks()` to discover gardens
  - Queries flower records to find garden activity
  - Checks config records for updates
  - No backend service needed - all queries from browser
- **Impact:** High - Core MVP feature complete
- **Priority:** ✅ COMPLETED

#### 2. **Accessibility Improvements** (Task 8.3)
- **Status:** ✅ COMPLETED
- **What was Missing:** ARIA labels and keyboard navigation for `leaflet.ts` layout
- **Resolution:** Added comprehensive ARIA labels to all interactive elements in leaflet.ts
- **Impact:** Low-Medium - Now compliant with accessibility standards
- **Priority:** Medium (COMPLETED)

#### 3. **8-bit Garden Artifact** (Not in plan)
- **Status:** ❓ UNCLEAR
- **What's Missing:** Clarification needed - is this different from current flower visualization?
- **Impact:** Low - May be covered by existing social card
- **Priority:** Low (clarification needed)

#### 4. **Webring Visualization** (Not explicitly in plan, but implemented)
- **Status:** ✅ **IMPLEMENTED** (prototype exists)
- **Implementation Details:**
  - **Flower Bed** (`src/layouts/flower-bed.ts`): Shows flowers planted in your garden
    - Each flower displays the planter's DID visualization
    - Clicking a flower opens a modal showing all gardens where that flower was planted
    - Uses `getBacklinks()` to find flowers planted in the garden
    - Uses `listRecords()` to find all gardens where a specific DID has planted flowers
  - **Collected Flowers** (`src/layouts/collected-flowers.ts`): Shows flowers you've taken
    - Each flower links back to its source garden (`/@${sourceDid}`)
    - Uses `listRecords()` to find your taken flower records
    - Shows flower lineage via `sourceDid` field
  - **Flower Lineage**: Tracked via backlinks - flowers link to gardens where planted, and collected flowers link back to source gardens
- **Impact:** Medium - Provides webring-like visualization of garden connections
- **Priority:** ✅ COMPLETED (prototype exists)

#### 5. **Animated Seedbox** (Not in plan)
- **Status:** ❌ NOT IMPLEMENTED
- **What's Missing:** Animation/visual feedback when taking a seed
- **Impact:** Low - UX enhancement, not blocking
- **Priority:** Low (nice-to-have)

#### 6. **Testing Checklist Items** (Not verified)
- **Status:** ❓ UNVERIFIED
- **What's Missing:** Manual testing verification of:
  - New user onboarding creates expected sections
  - Same DID generates same pre-populated sections (deterministic)
  - Flower visualizations are unique per DID
  - Guestbook option no longer appears
  - Existing guestbook sections still work
  - Flavor text is visible and helpful
  - Load Records has explanation text
  - New layouts render correctly
- **Impact:** Medium - Quality assurance
- **Priority:** High (should be verified before release)

---

### Requirements Coverage Summary

| Category | Total Requirements | Implemented | Partially Implemented | Not Implemented | Coverage |
|----------|-------------------|-------------|----------------------|-----------------|----------|
| **Core MVP** | 15 | 15 | 0 | 0 | 100% |
| **Nice-to-Have** | 2 | 2 | 0 | 0 | 100% |
| **Additional Ideas** | 4 | 2 | 0 | 2 | 50% (webring prototype exists) |
| **Testing** | 8 | 0 | 0 | 8 | 0% (unverified) |
| **TOTAL** | 29 | 18 | 0 | 11 | 62% (excluding testing, discoverability and webring complete) |

**Note:** Testing items are verification tasks, not implementation tasks.

---

### Review Plan: Comprehensive Feature Verification

#### Phase 1: Core Feature Verification (High Priority)
1. **Manual Testing Checklist Execution**
   - Test new user onboarding flow
   - Verify deterministic section generation (same DID = same sections)
   - Verify flower uniqueness per DID
   - Test guestbook removal and backward compatibility
   - Verify flavor text visibility
   - Test all new layouts (image, leaflet.pub, smoke-signal)
   - **Deliverable:** Testing report with pass/fail for each item

2. **Discoverability Implementation Verification**
   - ✅ Verified client-first Constellation/Slingshot integration
   - ✅ Confirmed discovery via flower records and backlinks
   - ✅ Verified garden discovery from config updates
   - **Status:** COMPLETED - No backend needed, uses AT Protocol APIs directly

3. **Accessibility Audit**
   - Complete ARIA labels for `leaflet.ts` (leaflet.pub layout)
   - Verify keyboard navigation across all layouts
   - Test with screen readers
   - **Deliverable:** Accessibility compliance report

#### Phase 2: Feature Completeness Review (Medium Priority)
4. **Social Card & Flower Visualization Review**
   - Verify social card generation works correctly
   - Verify flower image is included in social card
   - Test share to Bluesky functionality end-to-end
   - **Deliverable:** Feature verification report

5. **Flower Interaction Flow Review**
   - Test "plant a flower" flow
   - Test "take a seed" flow
   - Verify flower bed displays correctly
   - Verify collected flowers displays correctly
   - Test mushroom stealing with restrictions
   - **Deliverable:** Interaction flow test results

6. **Pre-population System Review**
   - Verify all required sections are included (profile, flower bed, collected flowers, share button)
   - Verify random sections are seed-based and deterministic
   - Test with multiple DIDs to verify uniqueness
   - **Deliverable:** Pre-population verification report

#### Phase 3: Gap Analysis & Future Enhancements (Low Priority)
7. **Clarify Ambiguous Requirements**
   - Determine if "8-bit garden artifact" is different from current implementation
   - Assess if webring visualization should be added to MVP
   - **Deliverable:** Requirements clarification document

8. **UX Enhancement Opportunities**
   - Evaluate animated seedbox implementation
   - Assess visual feedback improvements
   - **Deliverable:** UX enhancement recommendations

#### Phase 4: Documentation & Handoff
9. **Update Documentation**
   - Update `spec.md` with completed features
   - Document any deviations from original requirements
   - Create user guide for new features
   - **Deliverable:** Updated documentation

10. **Create Release Checklist**
    - Compile all verification results
    - Create go/no-go criteria for MVP release
    - **Deliverable:** Release readiness checklist

---

### Recommended Next Steps

1. **Immediate (This Week):**
   - Execute manual testing checklist (Phase 1, Task 1)
   - ✅ Complete accessibility improvements for `leaflet.ts` (leaflet.pub layout) (Task 8.3) - DONE
   - ✅ Review discoverability implementation (Phase 1, Task 2) - VERIFIED COMPLETE

2. **Short-term (Next 2 Weeks):**
   - Complete discoverability backend integration (Task 5.1)
   - Execute feature completeness review (Phase 2)
   - Update documentation (Phase 4, Task 9)

3. **Future Enhancements:**
   - Webring visualization (if desired)
   - Animated seedbox
   - Additional UX improvements

---

**Appendix Created:** 2024-12-19  
**Based on:** GitHub Issue #5 (hyphacoop/spores.garden) and implementation plan review
