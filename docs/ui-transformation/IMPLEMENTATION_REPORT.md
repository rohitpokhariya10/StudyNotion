# StudyNotion + Project NEET UI transformation

Completed on 5 October 2026 on branch `project-neet`.

The existing frontend now shares an ivory, blue, illustration-led education design system. Public pages were recomposed around the primary visual reference, [GrowEd’s public home page](https://www.growed.in/home). Learning, account, teaching, administration, and the NEET exam retain calmer application layouts. The current implementation has been production-build verified and its affected browser checks pass.

This report covers the UI phase only. The earlier [Project NEET implementation report](../project-neet/IMPLEMENTATION_REPORT.md) remains historical and was not rewritten. Existing uncommitted work was preserved. Nothing was committed, pushed, merged, deployed, or seeded.

## Design and route coverage

| Existing routes                                                                                               | Visual changes                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                                                                           | New split hero with original artwork; capability cards in a blue band; real category discovery; alternating learning, NEET, and teaching sections; four-step process; actual review feed/empty state; final CTA.                                                                        |
| Shared navigation and footer                                                                                  | Original book wordmark; compact white header; preserved destinations and account states; keyboard-operable mobile menu; grouped dark-blue footer with actual support/legal links and published categories.                                                                              |
| `/about`, `/contact`                                                                                          | Pale hero, existing StudyNotion photos, clearer headings, rounded capability compositions and form surfaces. Removed the old unsupported partner-count/statistic blocks and replaced generic marketing placeholders with descriptions of existing capabilities. No stored data changed. |
| `/privacy-policy`, `/cookie-policy`, `/terms`, `/refund-policy`, unmatched routes                             | Consistent document surfaces, readable hierarchy, distinguishable inline links, illustrated 404. Legal meaning is unchanged.                                                                                                                                                            |
| `/catalog/:catalogName`                                                                                       | Pale category intro, rounded search/filter panel, spacious course cards, visible focus treatment, unchanged filtering, sorting, cursor pagination, and resource states.                                                                                                                 |
| `/courses/:courseId`                                                                                          | Split summary/purchase-card layout; responsive mobile summary; curriculum, outcomes, instructor and real rating/enrollment information. Purchase consent and sign-in gates remain intact.                                                                                               |
| `/login`, `/signup`, `/forgot-password`, `/update-password`, `/verify-email`, `/accept-terms`                 | Shared form controls and status colors; illustrated login/signup cards; single-column mobile fields; retained password, consent, OTP and recovery behavior.                                                                                                                             |
| `/dashboard`, `/dashboard/my-profile`, `/dashboard/settings`, legacy `/dashboard/Settings`                    | Workspace framing, profile cards, existing destination shortcuts, account forms, accessible mobile sidebar dialog, readable destructive-action panel.                                                                                                                                   |
| `/dashboard/enrolled-courses`, `/dashboard/cart`, `/dashboard/purchases`                                      | Course cards with native progress indicators, illustrated empty enrollment/cart states, consistent purchase/refund presentation. Entitlement and payment logic are unchanged.                                                                                                           |
| `/view-course/:courseId/section/:sectionId/sub-section/:subSectionId`                                         | Quiet neutral reading surface, aligned controls and curriculum navigation; stable native video/player region and existing progress actions.                                                                                                                                             |
| `/dashboard/instructor`, `/dashboard/my-courses`, `/dashboard/add-course`, `/dashboard/edit-course/:courseId` | Teaching introduction, actual analytics/chart, responsive management cards, coordinated authoring/upload/lesson/publish forms and dialogs.                                                                                                                                              |
| `/dashboard/instructor-approvals`, `/dashboard/payment-reconciliation`                                        | Existing administrative screens restyled with shared form, status and surface tokens. No new admin routes or permissions.                                                                                                                                                               |
| `/project-neet`, `/project-neet/mocks`                                                                        | Shared-family palette, split science hero, original illustration, subtle retained helix backdrop, pale mock-list introduction, coordinated existing mock cards, visible mobile navigation.                                                                                              |
| `/project-neet/mocks/:testId/start`                                                                           | Contained onboarding flow, coordinated native radio/checkbox controls, candidate details, mode comparison, instructions, consent and system-check surfaces.                                                                                                                             |
| `/project-neet/attempts/:attemptId`, `/project-neet/attempts/:attemptId/result`                               | Restrained exam typography/radius/neutral alignment; results use the light science palette with existing score ring, metrics and subject breakdown. No decorative scene or marketing content was introduced into the exam.                                                              |

Several routes consume shared components without edits to their route files. All existing destinations and role boundaries remain in place.

## Shared components and original assets

`shared/styles/education.css` defines the ivory canvas, blue accent, pale blue/mint/peach surfaces, text and status colors, spacing, display/body typography, card/input/button geometry, shadows, section/container patterns, native progress styling, responsive stacking, and reduced-motion behavior. `globals.css` connects existing semantic classes and catalog tokens to the system. The already-installed Bricolage Grotesque and Atkinson Hyperlegible Next fonts are reused.

`BrandMark`, `LearningIllustration`, and `PageIntro` provide reusable identity, artwork and page introductions. The original inline SVG illustration has learning/workstation, science/atom, and distinct teacher/chalkboard compositions. No GrowEd artwork, copy, logos, people, reviews, contact data, or product identities were imported. Existing StudyNotion about-page assets remain in use.

Existing Button, LinkButton, IconBtn, HighlightText, ConfirmationModal, ErrorBoundary, navbar, footer, sidebar, review slider, course cards, forms and NEET presentation components were updated. The existing AccessibleDialog primitive is reused for the mobile workspace menu. Review autoplay was removed; manual carousel interaction remains. There are no new dependencies.

## Reference comparison

A dedicated comparison used the previously captured GrowEd desktop/mobile top, middle and full-page screenshots. It did not restart the reference research. The following decisions came from comparing those captures with the implemented pages:

| Area                    | Pattern adapted                                                                                                                                                           | Deliberate StudyNotion difference                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Home hero               | Approximately 1152px container, balanced two-column composition, pale backdrop, blue emphasis and prominent CTAs; centered mobile introduction with wide stacked actions. | Original learning illustration replaces the reference’s inquiry form. No new booking flow, urgency claims or invented student statistics. |
| Section rhythm          | Compact white header; substantial blue band containing a white capability card; alternating pale and ivory sections; roughly 48–80px section spacing.                     | Sections describe courses, progress, teaching and NEET rather than the reference’s services.                                              |
| Cards and process       | Soft borders/shadows, rounded geometry, short headings, illustrated sections and compact numbered steps.                                                                  | Cards show only existing course/category data; sparse catalogs remain sparse.                                                             |
| Navigation/footer       | Lightweight header, blue CTA, clear grouping and a denser dark-blue footer; mobile stacking and adequate touch targets.                                                   | StudyNotion destinations and legal/support information; no newsletter, chat service or copied landscape asset.                            |
| Catalog/course detail   | Pale contextual header, readable hierarchy, blue primary actions, rounded discovery/purchase surfaces.                                                                    | Existing filters, consent, purchase and curriculum controls dictate the functional layout.                                                |
| Auth                    | Spacious form card beside friendly original artwork; readable hierarchy and single-column mobile inputs.                                                                  | Existing account and policy controls are retained.                                                                                        |
| NEET landing/onboarding | Related split hero, science illustration, pale cards, blue actions and generous spacing.                                                                                  | NEET keeps subject/status colors and a more expressive landing headline; its exam remains a focused application.                          |

This is close visual-direction adaptation, not a pixel-identical clone. Typography, ivory/mint accents, original SVGs, product content, course/application workflows and section lengths intentionally differ. No quantitative visual-similarity score is claimed.

## Behavior and data integrity

A SHA-256 comparison against the phase-start snapshot checked 580 recorded files. No backend, contract, frontend API, model, or domain-helper files changed during this phase. Earlier backend/contract changes already present on `project-neet` are still in the working tree and are not redesign work.

Catalog queries and URLs, authentication/consent, course entitlement, cart/payment operations, progress, instructor/admin permissions and mutations remain connected to their original logic. NEET timers, autosave, retries, attempt state, ownership, tab/session coordination, scoring, submission and proctoring implementation remain unchanged. Test data is intercepted inside Playwright; no test fixture was persisted to the database. Additional public-page screenshot captures made read-only requests to the existing local API.

One production presentation defect was discovered: the instructor responsive-table dependency threw `ReferenceError: global is not defined`. The course listing now uses responsive React cards, preserving the original edit and archive/delete handlers, confirmation-name requirement and refresh behavior. No dependency or bundler configuration changed.

## Current verification

| Check                                  | Final result                                                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend Vitest                        | **219 passed, 50 files**. Latest complete run after the final application edit.                                                                                     |
| ESLint and architecture                | **Passed**. Architecture checker reported 286 frontend and 55 bounded backend source files. This was a static check, not a backend test rerun.                      |
| Typecheck                              | **Passed** after the final application edit.                                                                                                                        |
| Production build                       | **Passed**, including public-environment validation, using synthetic public settings and a fresh manifest.                                                          |
| Catalog and course-learning Playwright | **21 passed** across desktop Chromium, mobile Chromium and WebKit in the final affected-suite run.                                                                  |
| Project NEET Playwright                | **31 passed, 2 intentionally skipped** across desktop Chromium, mobile Chromium and WebKit. The skipped proctoring cases are the existing mobile/WebKit exclusions. |
| Additional UI Playwright               | **12 passed** across 1440px desktop, 390px mobile and 820px tablet projects. Public-page cases were refreshed after the last footer edit.                           |
| Distinct browser cases, combined       | **64 passed, 2 skipped**. This total combines the latest applicable runs; it is not a claim that the final single invocation ran all 66 cases.                      |
| Whitespace                             | `git diff --check` passed.                                                                                                                                          |

The last full browser invocation recorded 61 passed, 3 failed and 2 skipped. The three failures were the newly added purchase-gate tests attempting Buy Now before accepting the existing purchase consent. The test was corrected to assert the initial disabled state, check consent, assert the enabled state, then verify the sign-in dialog and destination. All three passed on the focused rerun. Following a final mobile-footer spacing correction, the affected public/catalog/learning invocation passed **24/24**. Unaffected NEET and workspace/auth results are from the full invocation on identical relevant application files.

Earlier iterations exposed and fixed: an enrolled-course JSX editing error; a legal unit-test mock missing the footer’s category query; a missing explicit button type; old home/focus presentation assertions; account-deletion and footer contrast; a chart canvas missing a label; legal inline links relying on color alone; an unlabeled upload input; and the instructor-table production crash. Functional assertions were retained or strengthened.

The broad previous backend, contracts, MongoDB, infrastructure and provider verification was **not rerun**. Those results remain historical in the earlier NEET report.

### Browser and accessibility coverage

The catalog cases verify destination navigation, keyboard focus, filters, cursor pagination, loading/error/empty/missing states and the purchase consent/sign-in gate. Learning cases verify curriculum navigation, canonical progress completion, retry/access-denied/empty states and the mobile curriculum drawer. NEET cases cover onboarding, manual/automatic submission, saved-answer resume, retry after interruption, duplicate-tab takeover/locking, already-submitted routing, ownership denial, consent/permission recovery, duplicate submission protection, reduced-motion/WebGL fallback and normal-home script isolation.

The added UI cases check public landmarks, one page-level heading, horizontal overflow, password visibility, account consent controls, mobile menu Escape/focus restoration, student profile/enrollment/settings/cart/purchases, native progress values, the workspace dialog, actual instructor analytics/management/authoring entry screens, the guarded deletion dialog, and the two existing admin screens.

Axe checks remain enabled for the tested public/auth/workspace/admin pages, catalog/detail, NEET onboarding/modes/exam/result, and the learning journeys. The learning suite retains its pre-existing `video-caption` exclusion because caption metadata is absent from the current product model. Automated checks do not replace a full assistive-technology audit.

## Visual inspection and evidence

Screenshots were inspected for hierarchy, proportions, spacing, wrapping, stacking, control visibility, modal placement and footer behavior. Public routes were also captured at 1440px and 390px using the local API. Added UI tests use 1440/390/820 CSS-pixel widths; existing catalog/learning/NEET projects use their desktop, Pixel 7 and WebKit device settings. Device-scale screenshots can have larger physical pixel dimensions.

Representative inspected artifacts are preserved here:

| Screen                                       | Evidence                                              |
| -------------------------------------------- | ----------------------------------------------------- |
| Home, desktop/full page                      | [Screenshot](screenshots/home-desktop.png)            |
| Home, readable mobile viewport               | [Screenshot](screenshots/home-mobile-top.png)         |
| Catalog, keyboard-focused course             | [Screenshot](screenshots/catalog-desktop.png)         |
| Course detail/mobile, including final footer | [Screenshot](screenshots/course-detail-mobile.png)    |
| Auth/desktop                                 | [Screenshot](screenshots/login-desktop.png)           |
| Student profile/mobile                       | [Screenshot](screenshots/profile-mobile.png)          |
| Lesson player/desktop                        | [Screenshot](screenshots/learning-desktop.png)        |
| Instructor course management                 | [Screenshot](screenshots/instructor-desktop.png)      |
| Course authoring/tablet                      | [Screenshot](screenshots/authoring-tablet.png)        |
| NEET landing/desktop                         | [Screenshot](screenshots/neet-desktop-top.png)        |
| NEET candidate onboarding                    | [Screenshot](screenshots/neet-onboarding-desktop.png) |
| NEET exam                                    | [Screenshot](screenshots/neet-exam-desktop.png)       |
| NEET result/mobile                           | [Screenshot](screenshots/neet-result-mobile.png)      |

Additional inspected captures include about/contact pages, signup/mobile, settings/tablet, the earlier reference comparison captures, and mock-list/landing mobile captures. Full generated evidence remains in `test-results/ui-transformation/`, `test-results/ui-transformation-public-final/`, and `test-results/ui-transform/screens/`. Account/course screenshots use clearly isolated browser fixtures, including placeholder thumbnails; they are not claims about live product inventory. The visible login password is a synthetic test string.

## Bundle comparison

Both builds used the same Node 24/Vite toolchain and synthetic production settings. Measurements sum each unique JavaScript file in the Vite manifest’s static dependency graph and gzip each file at level 9. Dynamic imports are excluded until that route is selected. Values below use decimal KB (1 KB = 1000 bytes), not a single filename or the Vite default gzip setting.

| Measurement                                       | Before, gzip KB | After, gzip KB |
| ------------------------------------------------- | --------------: | -------------: |
| Shared shell static JS                            |         242.979 |        241.059 |
| Initial home JS, shell + home static dependencies |     **284.783** |    **273.177** |
| Home-only addition to shell                       |          41.804 |         32.118 |
| Catalog addition to shell                         |           5.874 |          6.085 |
| Course-detail addition to shell                   |          48.216 |         48.616 |
| Learning addition to shell                        |           5.473 |          5.446 |
| Instructor-dashboard addition to shell            |          70.570 |         70.963 |
| NEET landing addition to shell                    |          15.997 |         16.128 |
| NEET onboarding addition to shell                 |          26.870 |         27.255 |
| NEET exam addition to shell                       |          32.887 |         33.287 |
| NEET result addition to shell                     |          12.840 |         12.898 |
| Separately loaded helix/Three.js chunk            |     **131.046** |    **131.046** |
| Initial home CSS                                  |          16.802 |         18.113 |

Initial home JavaScript decreased **11.606 KB gzip (~4.1%)**. Shared illustrations and layout helpers add small amounts to some route graphs; removal of the old home composition reduces the overall home graph. Route rows are independent measurements and must not be added together because they share dependencies.

The two locally served Latin variable-font files total **75.340 KB** of WOFF2 assets, now shared by normal StudyNotion routes. Font assets and images are not part of the JS table; other Unicode subsets load according to CSS unicode ranges. No total network-byte or Lighthouse improvement is claimed.

The helix chunk is byte-identical by filename/content and absent from the normal home graph. The browser isolation assertion also passed. Its existing >500 KB uncompressed build warning remains. Three.js is still dynamically loaded only by the NEET landing backdrop; exam code does not import it.

Machine-readable sizes and file sets: [bundle-comparison.json](bundle-comparison.json). Baseline and final production output directories are `/tmp/studynotion-ui-transformation/bundle-before` and `bundle-after`.

## Limits and remaining manual QA

- This is frontend verification with browser API fixtures plus read-only public local-API captures. Live Google sign-in, email/OTP delivery, Razorpay payments/refunds, actual upload persistence and administrative mutations were not exercised against providers.
- Existing empty categories/reviews remain truthful empty states. Richer populated content depends on actual product data. The review carousel’s populated styling was implemented; the live local review feed was empty during inspection.
- Course editing/builder/publish, OTP, pending-policy and complex refund/admin action variants share the restyled components and existing frontend tests, but every variant was not separately screenshot-inspected.
- Real mobile hardware, screen readers, high zoom, slow-network behavior with real media, and camera/microphone/fullscreen behavior across physical devices remain manual checks. The NEET browser exam fixture is intentionally small and is not a real 180-question endurance run.
- The existing standalone Vite development-server path encountered a CommonJS learning-contract export issue during preview setup. This UI phase used production previews for QA and did not change contracts or Vite dependency configuration to address that separate issue.
- The user’s existing Docker/live application was not rebuilt or deployed by this work. A running container with the previous frontend image will continue to show that image until rebuilt through the existing project workflow.

## Files and final working-tree checks

Relative to the pre-redesign working-tree snapshot, this phase changes **88 frontend source/test files**, with **2,628 lines added and 1,637 removed**. This includes presentation edits to existing files and the shared primitives. It excludes earlier Project NEET implementation changes already present before the redesign. The exact inventory, with per-file counts, is in [file-inventory.json](file-inventory.json).

Verification files: `e2e/catalog.spec.js`, `e2e/learning.spec.js`, `e2e/project-neet.spec.js`, the new `e2e/ui-transformation.spec.js`, and `playwright.ui.config.mjs`. New report artifacts live under `docs/ui-transformation/`. Historical catalog/learning audit screenshots were restored after directing new captures to Playwright output directories.

`git status --short`, `git diff --stat` and `git diff --check` were run at completion. The tracked whole-working-tree stat is **99 files changed, 12,281 insertions, 5,212 deletions**; it includes the earlier API/contracts work and omits untracked files, so it is not the redesign-only size. The working tree remains intentionally uncommitted. The final command output is saved under `test-results/ui-transform/git-status.txt`, `git-diff-stat.txt`, and `git-diff-check.txt`.

### Reproducing verification

Use the repository’s required Node 24 toolchain:

```sh
npm run test:frontend
npm run lint
npm run typecheck
CI=1 CAPTURE_CATALOG_SCREENSHOTS=1 CAPTURE_LEARNING_SCREENSHOTS=1 npx playwright test --config playwright.ui.config.mjs
```

The combined browser config serves an isolated local preview on port 4192 with intercepted API fixtures. The production build additionally requires the existing public-environment settings. The completed build used explicitly synthetic Google/Razorpay/support/legal settings for validation, not live deployment credentials.

Detailed local logs: `test-results/ui-transform/frontend-tests.log`, `lint.log`, `typecheck.log`, `build-final.log`, `browser-final.log`, `browser-catalog-final.log`, `browser-public-final.log`, and `frozen-files-check.json`.
