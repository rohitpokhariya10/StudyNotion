# Prahit branding audit — 7 October 2026

> Logo source superseded: the official two-character Glossy Blob Companions artwork is now specified in [the asset README](../../apps/web/src/shared/assets/brand/README.md). This audit records the preceding text rebrand; its old best_1/book-icon details are historical. The checkout image is also updated in the later logo-only task, while payment code remains unchanged.

The frontend rebrand is complete within the authorized UI scope and is served on `http://localhost:3000`. **Protected checkout and backend-generated content still contain the old name.** This document does not claim an application-wide backend or persisted-data migration.

## Official artwork

Original `apps/web/src/shared/assets/brand/original/best_1.png` matches the user-supplied file exactly (SHA-256 `0bf8deba6943219f0f498e1848d07ec02a22c756dd386738c0ff5e935d757cc4`). `prahit-logo.webp` retains its full cream/blue/yellow artwork on the supplied blue backing. No tracing, invented font or threshold-based transparency removal. See [exact crop and icon derivation](../../apps/web/src/shared/assets/brand/README.md).

`BrandLogo.jsx` is the shared image component; `BrandMark.jsx` is a compatibility re-export. Desktop/mobile navbar logo heights are 60/48px within the existing 80/64px navigation. Auth and contact panels use 140px-wide marks; the footer uses 124px. Aspect ratio is preserved, and labelled links use a decorative image to avoid announcing the brand twice.

Public assets changed: `apps/web/public/{favicon.ico,icon.svg,logo.png,logo192.png,logo512.png,manifest.json}`. Added `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`. The icon is the supplied book detail, not the whole wordmark squeezed down. `apps/web/index.html` supplies Prahit title, description, icons and social metadata; URLs stay relative/configuration-bound, without inventing a production domain.

## Remaining name classification

[Line-by-line file inventory](verification/prahit-branding-occurrences.json) records the final case-insensitive search. It stores locations and categories, not configuration secrets.

- **Missed static frontend branding:** none found in reviewed active presentation code/metadata. Remaining frontend runtime literal is the protected checkout exception below. Fetched/persisted content and genuine configured legal/contact values remain untouched.
- **Intentional compatibility:** `@studynotion/contracts` imports, workspace/package names, environment keys, Compose services/network/database identifiers, logging/cloud-media namespaces, auth issuer/audience, `studynotion.checkout.v1`, and `https://studynotion.invalid` (internal redirect validation). Example/local configuration remains unchanged. Local support/address/operator placeholders are suppressed in the public UI; real configured values remain verbatim.
- **Historical material:** root project briefs/context, `docs/**`, existing evidence/baseline, comments and test fixtures retain their original references. Unused `Logo-Full*` / `Logo-Small*` assets are retained, not imported by current brand components.
- **Protected checkout/backend/persisted content:** exact visible exceptions below. No provider/email flow was modified to hide these.

| Remaining source | Reason retained |
| --- | --- |
| `apps/web/src/features/course-purchase/api/coursePurchaseApi.js:164` | Razorpay options still set `name: "StudyNotion"`; the imported `rzp_logo.png` at line 9 is used at line 166. This existing payment API is explicitly frozen. |
| `apps/api/controllers/Auth.js:425,483` | Verification and password-update email subjects. Backend outside UI scope. |
| `apps/api/controllers/resetPassword.js:61` | Reset-password email subject. |
| `apps/api/controllers/ContactUs.js:50` | Contact email subject. |
| `apps/api/mail/templates/contactFormRes.js:19` | Contact email HTML title. |
| `apps/api/mail/templates/templateUtils.js:32` | Email brand falls back to StudyNotion, or the existing configured `BRAND_NAME`. |
| `apps/api/modules/project-neet/content/sampleMocks.js:34` | Server/seed practice-mock disclaimer may appear in returned/persisted content. |
| `apps/api/scripts/seed.js:267` | Seeded demo-course thumbnail text; no data rewrite or reseed performed. |
| Existing deployment configuration and stored/user-authored content | Actual domains, legal operator, support addresses, email sender, course/review/profile content remain as configured/stored. No new public identity or production domain invented. |

## Rebrand implementation inventory

These are the frontend/test files carrying the rebrand, including work completed before the interruption and retained here. Several also contain earlier unrelated redesign work; this inventory is not a claim that their entire git diff was authored during this continuation. The previous transient start-of-rebrand hash inventory was lost when the host restarted. The original redesign baseline was preserved.

- `apps/web/index.html`
- `apps/web/public/manifest.json`
- `apps/web/src/entities/editorial/model/articles.js`
- `apps/web/src/entities/neet/lib/errors.js`
- `apps/web/src/features/authentication/ui/Template.jsx`
- `apps/web/src/features/neet-exam/ui/ExamShell.jsx`
- `apps/web/src/features/neet-onboarding/ui/CandidateDetailsForm.jsx`
- `apps/web/src/pages/about/index.jsx`
- `apps/web/src/pages/blog-article/index.jsx`
- `apps/web/src/pages/blogs/index.jsx`
- `apps/web/src/pages/careers/index.jsx`
- `apps/web/src/pages/catalog/Catalog.test.jsx`
- `apps/web/src/pages/contact/ui/ContactDetails.jsx`
- `apps/web/src/pages/contact/ui/ContactForm.jsx`
- `apps/web/src/pages/home/ui/sections/ContactSection.jsx`
- `apps/web/src/pages/home/ui/sections/ExperienceBand.jsx`
- `apps/web/src/pages/home/ui/sections/GuidanceSection.jsx`
- `apps/web/src/pages/home/ui/sections/HowItWorks.jsx`
- `apps/web/src/pages/home/ui/sections/JoinCard.jsx`
- `apps/web/src/pages/home/ui/sections/ReviewsSection.jsx`
- `apps/web/src/pages/home/ui/sections/TeachSection.jsx`
- `apps/web/src/pages/home/ui/sections/WhyBand.jsx`
- `apps/web/src/pages/legal/Legal.test.jsx`
- `apps/web/src/pages/legal/index.jsx`
- `apps/web/src/pages/services/index.jsx`
- `apps/web/src/pages/services/ui/Differentiators.jsx`
- `apps/web/src/pages/services/ui/LearningShowcase.jsx`
- `apps/web/src/pages/services/ui/LearningSteps.jsx`
- `apps/web/src/pages/services/ui/StatsStrip.jsx`
- `apps/web/src/pages/signup/index.jsx`
- `apps/web/src/shared/assets/brand/README.md`
- `apps/web/src/shared/config/publicContact.js`
- `apps/web/src/shared/config/publicContact.test.js`
- `apps/web/src/shared/ui/AuthLayout.jsx`
- `apps/web/src/shared/ui/BrandLogo.jsx`
- `apps/web/src/shared/ui/BrandMark.jsx`
- `apps/web/src/shared/ui/ErrorBoundary.jsx`
- `apps/web/src/shared/ui/FlaskLoader.test.jsx`
- `apps/web/src/shared/ui/brandLogo.css`
- `apps/web/src/widgets/footer/ui/Footer.jsx`
- `apps/web/src/widgets/footer/ui/Footer.test.jsx`
- `apps/web/src/widgets/instructor-strip/ui/InstructorStrip.jsx`
- `apps/web/src/widgets/marketing/ui/ContactPanel.jsx`
- `apps/web/src/widgets/navbar/ui/Navbar.jsx`
- `apps/web/src/widgets/neet-hero/ui/NeetHero.jsx`
- `apps/web/src/widgets/neet-shell/ui/ProjectNeetShell.jsx`
- `e2e/live-stack.spec.js`
- `e2e/ui-transformation.spec.js`

Binary assets and icons are listed above and in the source README. The bird correction changes only `apps/web/src/shared/assets/editorial/footer-landscape.svg`, with its retained source in `docs/growed-redesign/artwork/{footer-birds,generate-footer-landscape}.mjs`. Other writes in this continuation are progress/evidence documentation.

## Preservation and verification limits

The original 720-file/306-frozen-file baseline and audit script are unchanged. [The audit](verification/prahit-final-preservation.json) exits 1 with six transparent flags: two prior font manifests, three prior loading-presentation route guards, and Legal's newly authorized name/contact presentation changes. Legal policy wording beyond the brand substitution, effective date, checkout-config fetch and refund rules remain intact. No backend/API/contracts/payment/session/deployment source was changed by this continuation.

Five authorized Project NEET **copy-only** differences from the original baseline: `entities/neet/lib/errors.js`, `features/neet-exam/ui/ExamShell.jsx`, `features/neet-onboarding/ui/CandidateDetailsForm.jsx`, `widgets/neet-hero/ui/NeetHero.jsx`, `widgets/neet-shell/ui/ProjectNeetShell.jsx` (under `apps/web/src`). No NEET timing, proctoring, attempts, routes, validation or requests changed.

Rebrand verification inspected before host restart: 251 tests / 58 files, lint/architecture (345 frontend / 55 bounded backend), typecheck; focused browser cases 20 initially passed with one mobile timeout, then that unchanged isolated case passed in 24.2s (seven successes per desktop/mobile/tablet project). Authenticated role captures use synthetic API fixtures. Original temporary logs disappeared on restart; no whole-suite rerun was needed for the later bird-only change.

Final persisted evidence: [10 focused unit tests](verification/prahit-focused-final.log), [15 actual localhost cases, no API mocks](verification/prahit-localhost-final.json), [web image build](verification/prahit-final-web-build.log), [web recreation](verification/prahit-final-web-up.log), [API/MongoDB/Redis identities/start times/mounts unchanged across delivery](verification/prahit-final-container-audit.json). The browser asserted byte equality of the served final landscape SVG with the source asset. Desktop/mobile full-footer and bird close-up captures are linked in [PROGRESS.md](PROGRESS.md).

An unrelated isolated Vite dev-server attempt failed on `learningCourseResponseSchema` CommonJS/ESM export handling in the existing contracts configuration. It was stopped without modifying protected files. The production Docker app works. Real payments, transactional emails and provider-authenticated production data were not exercised. These are limits of verification, not claims of provider migration.
