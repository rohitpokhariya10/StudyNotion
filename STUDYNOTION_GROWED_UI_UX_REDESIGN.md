# StudyNotion → GrowEd UI/UX Recreation Brief

**Implementation instructions for Claude Code / Codex**  
**Prepared:** 6 October 2026  
**Reference:** https://www.growed.in/home  
**Scope:** Redesign the complete frontend and its information architecture. Preserve the existing backend and application capabilities.

## 1. The assignment

Recreate GrowEd's public-site composition and visual language closely inside the existing StudyNotion application. Apply the same design system to every existing authenticated screen, including student learning, purchases, instructor authoring, and admin tools.

This is a complete UI/UX redesign, not a homepage-only exercise or a blue recoloring of the current interface. Match the reference's page hierarchy, section rhythm, typography, illustrations, forms, cards, navigation, footer, and responsive behavior as closely as evidence permits. Keep StudyNotion's identity, actual content, existing integrations, and functional flows.

**“Whole application structure” means the user-facing page organization, navigation, layouts, and component composition. It does not authorize changing the backend architecture, database, roles, API contracts, or business model.**

Do the implementation in the user's existing repository. Do not generate a separate demo, migrate to Next.js, create a new backend, or replace the working application with static mock screens.

### Non-negotiable completion conditions

1. Every existing route listed in this document receives the new design, including loading, error, empty, modal, and mobile states.
2. The public experience follows GrowEd's structure: Home, About Us, Services, Careers, Blogs, and a shared illustrated footer. Add these presentation-only routes where missing.
3. Catalog, course details, auth, checkout, learning, settings, instructor, and admin functions remain reachable and operational.
4. No backend, database, shared contract, payment logic, authentication authority, or deployment change.
5. Do not add fake booking, newsletter, chat, discounts, testimonials, earnings, instructors, or learning capabilities to imitate a screenshot.
6. Keep source-derived behavior. If this brief conflicts with the live checkout, source code wins; record the discrepancy and adapt the presentation.

## 2. Sources and confidence

### Project evidence

Use these sources in the user's requested order:

1. `STUDYNOTION_CODEBASE.md`: implementation evidence; snapshot contains 461 selected source/config/test files.
2. `STUDYNOTION_AI_CONTEXT.md`: architecture, business flows, tests, deployment, and legacy boundaries.
3. `PROJECT_CONTEXT.md`: navigation map; its audit baseline is commit `7b367c0`, dated 2026-10-04.

The supplied files were read for this brief. The working repository and running StudyNotion UI were **not** available for execution during preparation. Confirm paths and behavior against the live repository before editing. This document does not claim that any redesign has already been implemented or tested.

`Project-NEET-—-Master-Context-&-Product-Research.txt` concerns a separate product hypothesis. Do not introduce NEET mock recovery, OMR uploads, question banks, or AI mistake analysis into this frontend redesign.

### Reference inspection register

| Reference | What was inspected | Confidence / limit |
| --- | --- | --- |
| https://www.growed.in/home | Rendered desktop hero, page DOM, section sequence, typography and CSS values, testimonial/CTA area, tutor carousel, contact area, illustrated footer | Direct browser inspection at a 1363 × 936 viewport; some measurements are rounded |
| https://www.growed.in/services | Hero, metrics strip, feature groups, onboarding steps, FAQs, booking-dialog DOM | Direct inspection; opening the booking control exposed phone/course inputs and a close action; no form submitted |
| https://www.growed.in/about-us | Story/mission/inspiration sections, article links, team heading | DOM inspected; initial screenshot had substantial unloaded/blank imagery, so do not treat that blank region as intended design |
| https://www.growed.in/careers | Blue hero and navigation, culture blocks, benefits content | Direct desktop inspection; some image assets initially loaded late |
| https://www.growed.in/blogs | Dark featured-article hero, category pills, image/text article rows | Direct DOM and desktop visual inspection |
| https://www.growed.in/blogs/5Ij3OB5za2MbZE1J9i5LYq | Article heading/image/body, breadcrumb, search/tag/related-content sidebar | Direct desktop inspection |
| GrowEd mobile layouts | Responsive class clues in rendered DOM | Actual mobile screenshots were not captured; mobile values below are implementation targets to validate, not measured reference values |
| GrowEd private dashboards/authentication | No authenticated product screens inspected | The dashboard and auth designs below are deliberate StudyNotion adaptations; do not call them verified GrowEd replicas |
| GrowEd legal-document pages and individual About detail pages | Links observed, full pages not inspected | Keep existing StudyNotion legal content; use the established public typography |

**Evidence labels used below:** `Observed` = inspected reference behavior/style; `Target` = chosen implementation specification; `Adaptation` = required to fit StudyNotion without backend work.

During implementation, inspect the live reference again where browser access exists. Capture stable screenshots after fonts/images load. If it is inaccessible, proceed from this brief and report the specific visual uncertainties. Never claim pixel-perfect equivalence to screens you could not inspect.

## 3. Verified application baseline

- Workspace frontend: `apps/web`; source alias `@/` resolves to `apps/web/src`.
- React 19, React Router 8, Vite 8, Tailwind 4, Redux Toolkit/RTK Query; application code predominantly JSX/JavaScript.
- Source entry: `apps/web/index.html` → `src/app/main.jsx` → `bootstrap.jsx` → providers → `App` → `AppRouter`.
- `apps/web/src/widgets/app-shell/AppShell.jsx` currently owns `Navbar`, `RouteErrorBoundary`, and `Suspense`. Its root uses the dark `bg-richblack-900` theme.
- Footers are composed by individual pages. Do not insert another global footer without removing duplicate ownership deliberately.
- `apps/web/src/app/router/AppRouter.jsx` owns lazy route composition and auth/role boundaries.
- Dependency direction: `app → pages → widgets → features → entities → shared`. Avoid same-layer feature-to-feature imports; compose at a page/widget boundary.
- Existing APIs use both v1 adapters and v2 RTK Query. This redesign does not unify or rewrite them.
- Cookies carry authentication; Redux `auth.token` is a compatibility boolean, not a bearer JWT.
- Students, Instructors, and Admins remain the exact existing account types. “Tutor” may be a display label only.

## 4. Change boundaries

### Allowed

- Frontend JSX structure, CSS, semantic tokens, local presentation assets, typography, spacing, imagery, responsive layouts, accessibility, and visual interaction states.
- New reusable presentation components within the established dependency layers.
- New static marketing routes and their local content; route aliases that preserve current URLs and guards.
- Existing feature UI restyling while retaining handlers, validation, form registration, and data ownership.
- Presentation-only state for a mobile menu, disclosure, tabs, article category filtering, or carousel.
- Focused frontend tests and screenshot baselines for altered UI/behavior.

### Frozen

- Everything under `apps/api/**` and `packages/contracts/**`.
- Database models, migrations, seeds, API controllers/routes/services, response shapes, upload permissions, payment providers, webhook fulfillment, and enrollment/entitlement behavior.
- `apps/web/src/shared/api/**`, existing `entities/*/api/**`, existing `features/*/api/**`, Redux reducers/store registration, authentication session integration, checkout idempotency, and route-guard logic.
- Existing legal document wording and policy versions; only their presentation may change.
- `.github/**`, Docker/Nginx/Compose, environment values, deployment scripts, and release configuration.
- Existing dependency versions. Use installed UI tools first; do not install a framework to mimic GrowEd's framework.

Frozen modules may be read and called. Do not edit them to make an easier-looking UI work. If an unrelated defect is found, document it separately. Never hide a broken function behind a disabled or removed control to claim completion.

### Backend preservation check

At the start, record `git status --short` and the starting commit. Preserve pre-existing user changes. At the end, compare **your task changes** against that baseline; no task-authored modifications may affect frozen paths. A dirty checkout does not authorize reverting someone else's work.

## 5. Reference design system

### 5.1 Visual character

`Observed`: spacious education marketing pages, white surfaces, medium blue CTAs, black headings with selectively blue words, rounded rectangular forms, thin borders, soft shadows, education illustrations, hand-drawn underline accents, occasional yellow/coral accents, broad blue section bands, and a mountain/forest footer. Tutor cards sit on a blue gradient and use small alternating rotations.

The default product is light. The blog landing hero has a distinct black treatment and Careers has a blue treatment. These are intentional public-page variants, not a reason to retain the old dark StudyNotion theme everywhere.

### 5.2 Measured values versus implementation targets

| Property | Reference observation | Implementation rule |
| --- | --- | --- |
| Main typeface | `Poppins`, sans-serif fallback | Self-host Poppins WOFF2 if available with its license; 400/500/600/700; `font-display: swap` |
| Form typeface on home booking/contact | Roboto appears in computed styles | Target: use Roboto for corresponding compact marketing forms if available; use Poppins consistently elsewhere |
| Main blue | CSS `--primary: lab(47.334% 1.37526 -55.7148)` | Use this measured color; `#1971cd` is an approximate fallback, not a measured exact hex |
| Highlighted-heading blue | `lab(47.1318% .690281 -54.437)` | Separate heading accent token if necessary for comparison |
| Main foreground | `lab(2.75381% 0 0)` | Near-black; do not use pale gray body text on white |
| Background | White | Default public and form canvas |
| Benefits-band tint | `lab(92.0301% -2.24757 -11.6453)` | Pale blue behind a large white panel |
| Tutor-band gradient | RGB `(14,72,162)` to `(25,113,205)` | Horizontal blue gradient; preserve light cards and white intro text |
| Navbar | Approximately 80px tall at inspected viewport | Desktop target 80px; mobile target 64px; expose a height variable |
| Section outer max width | 1280px (`max-w-7xl`) | Centered section shell; padding is included in this outer width |
| Section padding | Desktop 80px vertical / 64px horizontal | Tablet target 64px / 32px; mobile target 48px / 24px; verify visually |
| Hero title | 48px on desktop | 48px/1.15 desktop, target 34–38px mobile; keep similar line wrapping |
| Section titles | Often 30px; smaller promo headings 24px | 30px/1.2 desktop, 24–28px mobile; use semantic h2 instead of copying multiple h1s |
| Body/navigation | Commonly 16px | 16px body with 1.5–1.65 line height |
| Small labels | 14px; small metadata approximately 12px | Keep actionable mobile inputs at least 16px text |
| Primary button | 36px reference visual height, radius 8px | Marketing desktop may match 36px; provide at least 44px mobile hit area; operational product controls 44px |
| Inputs | 36px reference height, 8px corners, thin neutral border | Product forms target 44–48px; preserve the reference spacing and proportions |
| Cards | White/light-blue, soft border/shadow, modest corners | Target radii 10–16px, not oversized pill cards |

Example semantic foundation to adapt in `apps/web/src/shared/styles/globals.css`:

```css
:root {
  --sn-primary: #1971cd; /* approximate fallback */
  --sn-primary: lab(47.334% 1.37526 -55.7148);
  --sn-canvas: #ffffff;
  --sn-surface: #ffffff;
  --sn-surface-soft: #f3f8fd; /* target, not a measured reference token */
  --sn-text: #101010;
  --sn-muted: #595959;
  --sn-border: #e5e5e5;
  --sn-radius-control: 8px;
  --sn-radius-card: 12px;
  --sn-header-height: 80px;
  --sn-card-shadow: 0 2px 5px rgb(0 0 0 / 0.12);
}
```

Use semantic success/warning/danger colors with readable light backgrounds. Blue remains the primary action. Yellow/orange stars must not become fake ratings. Check text/button contrast in rendered UI; darken an accessible action variant if required while preserving the blue family.

### 5.3 Tailwind migration precautions

The current stylesheet resets `--color-*` and `--font-*` inside `@theme`. Default Tailwind color/font utilities cannot be assumed to exist.

1. Add explicit semantic tokens compatible with the current Tailwind 4 setup.
2. Remap shared aliases such as `brand-primary`, `surface-primary`, `text-primary`, `border-default`, and `focus` to the new palette.
3. Remap **all** `.catalog-theme` RGB values: the current catalog is beige/orange and would otherwise remain visually separate.
4. Replace hard-coded `bg-richblack-*`, light text, yellow primary CTAs, dark borders, and incompatible gradients in every route component.
5. Update shared `.yellowButton`, `.blackButton`, `.form-style`, `.lable-style`, `.section_heading`, sidebar `.active-icon`, and focus/scrollbar rules carefully. Class names may remain temporarily for compatibility; their presentation must become coherent.
6. Do not globally redefine `richblack-900` as white or `white` as black. Those tokens have legitimate roles in video, images, and inverse sections.
7. Remove unused homepage code-glow decoration only after confirming no remaining references.
8. Preserve reduced-motion handling. Fix actual overflow rather than relying on `overflow-x: hidden` to conceal clipped controls.

### 5.4 Shared component behavior

| Component | Design | Behavior |
| --- | --- | --- |
| Button / LinkButton / IconBtn | Blue primary; white outlined secondary; restrained text action | Preserve `type`, `disabled`, loading, href/to, click handler, keyboard semantics; no nested button/link |
| FormField | Label above; white input; subtle border; blue focus | Keep label/input association, errors, help text, autocomplete and form registrations |
| StatusPanel | Light surface, compact illustration/icon, clear action | Distinguish empty/error/denied; show existing safe request IDs when supplied |
| ConfirmationModal | White 12px card, subdued overlay | Labelled dialog, trapped focus, Escape where appropriate, return focus, existing confirmations |
| Course card | Image, category, title, instructor, rating, metadata, price | Real DTO only; preserved details destination and image fallback |
| Review card | Pale-blue card, avatar/name, stars, readable quote | Real review API; no copied reference testimonials; full text accessible |
| Section heading | Black/blue text with restrained underline | One h1 per page; decorative underline hidden from accessibility tree |
| Carousel | Cards, dots, circular arrow controls | Keyboard usable; no auto-motion under reduced-motion; do not make content hover-only |
| Toast / global fallback | Light, legible, blue accents | Preserve provider/error-boundary placement and existing messages |

## 6. Information architecture and routes

### 6.1 Public navigation target

Use GrowEd's primary navigation order: **Home → About Us → Services → Careers → Blogs**. Keep StudyNotion's logo/name. Add a compact course-discovery access point and the existing auth/cart/profile affordances without crowding the menu.

Desktop: logo at left; public links in the central/right area; auth or profile controls at right. Active page gets a thin blue underline. Inverse Careers/Blogs hero variants use light links with a visible active line. Logged-in profile menu keeps dashboard/settings/logout access. Student cart retains its count and route.

Mobile: logo + menu button + compact account control. Drawer includes all public links, course categories/discovery, and the correct auth or role actions. Close on navigation/Escape, restore trigger focus, prevent background interaction while open. No hover-only dropdowns.

### 6.2 New presentation routes and compatibility

These are **new frontend-only routes**, not existing source paths:

| New route | Purpose | Handling |
| --- | --- | --- |
| `/home` | GrowEd-like home alias | Redirect to `/`; preserve query/hash; do not duplicate Home implementation |
| `/about-us` | Reference-compatible About alias | Redirect to existing `/about`; preserve query/hash |
| `/services` | Service overview and course discovery | New lazy page using existing category hook and verified course capabilities |
| `/careers` | Teaching/instructor opportunity presentation | New static page; CTA enters existing signup; no hiring backend or resume upload |
| `/blogs` | Editorial listing | New static local-content page with working client-side category filtering |
| `/blogs/:slug` | Editorial article reading | New local-content article page; unknown slug gives a useful not-found state |

Keep existing public routes working exactly. Do not invent `/catalog/all`, `/checkout`, `/student/dashboard`, `/tutors/:id`, or `/book-demo` and link to them as if implemented.

**Catalog trap:** `pages/catalog/index.jsx` resolves `catalogName` against `categoryPathSlug(item.name)` from fetched categories. Without a matching category, it displays a category-not-found state. Therefore:

- `/services` contains the general discovery experience and real category links.
- A user selects an actual category before the hero finder navigates to `/catalog/<resolved-slug>`.
- Use `categoryPathSlug()` rather than a second slug algorithm.
- Pass searches through the existing query-string helpers and `URLSearchParams`; do not interpolate unencoded user input.

### 6.3 Existing route coverage: all must be redesigned

All source paths in this table are under `apps/web/src/`.

| Existing route | Existing page | Required redesigned screen |
| --- | --- | --- |
| `/` | `pages/home/index.jsx` | Full reference-based marketing homepage |
| `/about` | `pages/about/index.jsx` | Story/mission/inspiration composition |
| `/contact` | `pages/contact/index.jsx` | Split identity panel and functional contact form |
| `/catalog/:catalogName` | `pages/catalog/index.jsx` | Blue/white discovery, existing filters and pagination |
| `/courses/:courseId` | `pages/course-details/index.jsx` | Course hero, curriculum, purchase card, reviews |
| `/privacy-policy` | `pages/legal/index.jsx` | Readable policy article; retain privacy document |
| `/cookie-policy` | `pages/legal/index.jsx` | Same legal shell; retain cookies document |
| `/terms` | `pages/legal/index.jsx` | Same legal shell; retain terms document |
| `/refund-policy` | `pages/legal/index.jsx` | Same legal shell; retain refund content/config |
| `/login` | `pages/login/index.jsx` | Branded split authentication layout |
| `/signup` | `pages/signup/index.jsx` | Student/instructor signup and policy controls |
| `/verify-email` | `pages/verify-email/index.jsx` | Verification card and existing OTP behavior |
| `/forgot-password` | `pages/forgot-password/index.jsx` | Recovery card and sent/error states |
| `/update-password` | `pages/update-password/index.jsx` | Reset form and existing challenge handling |
| `/accept-terms` | `pages/policy-acceptance/index.jsx` | Mandatory policy flow with legible documents |
| `/dashboard` | Router redirect | Preserve redirect to `/dashboard/my-profile` |
| `/dashboard/my-profile` | `pages/profile/index.jsx` | Profile summary and existing editable-data links |
| `/dashboard/settings` | `pages/settings/index.jsx` | Profile/security/preferences supported today |
| `/dashboard/Settings` | `LegacySettingsRedirect()` | Preserve case-sensitive compatibility, query/hash |
| `/dashboard/enrolled-courses` | `pages/enrolled-courses/index.jsx` | Learning library with actual progress |
| `/dashboard/cart` | `pages/cart/index.jsx` | Cart rows/cards + summary + existing checkout |
| `/dashboard/purchases` | `pages/purchase-history/index.jsx` | Purchases and refund-request workflow |
| `/dashboard/instructor` | `pages/instructor-dashboard/index.jsx` | Existing metrics/chart/course overview |
| `/dashboard/my-courses` | `pages/instructor-courses/index.jsx` | Instructor course management |
| `/dashboard/add-course` | `pages/course-create/index.jsx` | Existing three-stage authoring wizard |
| `/dashboard/edit-course/:courseId` | `pages/course-edit/index.jsx` | Edit workflow in same wizard shell |
| `/dashboard/instructor-approvals` | `pages/instructor-approvals/index.jsx` | Admin approval queue |
| `/dashboard/payment-reconciliation` | `pages/payment-reconciliation/index.jsx` | Admin payment/refund reconciliation |
| `/view-course/:courseId/section/:sectionId/sub-section/:subSectionId` | `pages/learning/index.jsx` + `pages/lesson/index.jsx` | Protected learning shell and actual lesson player |
| `*` | `pages/not-found/index.jsx` | Branded 404 with working recovery links |

Retain `OpenRoute`, `PrivateRoute`, `RoleRoute`, lazy loading, safe internal return paths, and the special `allowPendingPolicies` route behavior. A navigation label never grants a role.

## 7. Homepage specification

Replace the existing Home composition. Remove its visible coding terminal/code-block motif, centered dark hero, huge video hero, and old yellow/dark CTA styling. Reuse working feature components where useful, but rebuild the page hierarchy below.

### 7.1 Exact section order and functional adaptation

| Order | Observed GrowEd structure | StudyNotion implementation |
| --- | --- | --- |
| 1 | White desktop header, brand left, public navigation | Shared navbar from section 6 |
| 2 | Pale hero; left headline, description, wide CTA and trust area; compact white form card on right | Same two-column composition; use a course finder on right, not a fake booking service |
| 3 | Full-width blue band containing a large white learning-benefits panel | Explain choosing a course, following lessons, tracking completion; supporting education illustration |
| 4 | Centered testimonial introduction and three pale review cards | Restyle real `ReviewSlider`; loading/empty/error presentation remains truthful |
| 5 | Smaller centered bordered promo card with copy left and illustration right | Invite exploration of course content; CTA `/services`; no promised PDF without an actual file |
| 6 | Pale-blue full-width band with white benefits card and supporting human illustration | Benefits grounded in current product: organized curriculum and account-based learning progress |
| 7 | Three numbered feature rows with illustrations and alternating composition | Discover a subject → study the lessons → track completion; links to real destinations |
| 8 | Compact centered promotional/offer block | Neutral learning invitation; no fabricated discount, timer, free session, or scarcity |
| 9 | Large illustration with a stacked list of service explanations | Course discovery, structured learning, instructor-created courses; supported capabilities only |
| 10 | Blue learning-needs callout with text/action and illustration | Link to category discovery; do not claim personalized recommendation logic |
| 11 | Instructor recruitment split section with yellow decoration | Explain instructor signup and approval; CTA `/signup`, instructor tab remains explicit |
| 12 | Blue-gradient instructor carousel with slightly tilted white portrait cards | Use verified, approved public marketing content if provided; otherwise use clearly non-personal teaching/value cards in the same composition |
| 13 | Large contact section: blue identity panel left, form right | Compose existing contact feature and actual StudyNotion support details |
| 14 | Mountain/forest footer, upper CTA strip, link columns and contacts | Locally owned landscape illustration; adapt newsletter slot to a working discovery CTA |

Avoid shortening the page into a hero + three generic cards. The section sequence and changes in scale/background are central to the reference's identity.

### 7.2 Hero geometry

Observed desktop screenshot: 80px navbar; content begins around y=160; left heading x≈97; right form x≈751, width≈416; next blue band begins around y=741. These are **reference anchors**, not absolute coordinates for all viewports.

- Outer section: max 1280px including 64px side padding at large widths.
- Two columns: approximately 1.2fr / 1fr; generous gap; left text around 420–480px; right card around 420px maximum.
- Heading uses around three lines at desktop. Target original copy: “Build your skills. Shape your future.” Emphasize the first phrase in blue. Adjust line breaks and length to preserve the reference proportions.
- Supporting paragraph: one concise two-line explanation of StudyNotion's real course experience.
- Main CTA: “Explore courses” → `/services`; blue, approximately 384px max-width on desktop.
- Right card: white, 12px corners, 24px padding, subtle shadow; heading, two stacked controls, full-width CTA, one reassurance line.
- Form fields: real category select + optional search query. Submit “Find courses”. Navigation only; no new API.
- Category states: loading indicator, retry on failure, friendly no-category state. Never navigate with an empty or fabricated slug.
- Preserve visual space for a trust/value cluster below the CTA. Use supported product facts such as structured lessons and progress tracking. If real aggregate data is unavailable, do not display made-up learner totals, review aggregates, Trustpilot marks, or alumni/company logos.
- Mobile target: text first, card second; one column, natural height, full-width controls. Do not retain desktop fixed y-coordinates.

### 7.3 Content and asset rules

Copy **composition**, not GrowEd's company identity, legal text, phone number, claims, tutor identities, photographs, or reviews. Keep StudyNotion branding unless the owner separately requests a rename.

Use local approved assets with comparable subject matter, aspect ratio, and visual weight. Needed asset slots:

| Slot | Visual job | Target treatment |
| --- | --- | --- |
| Brand | Header recognition | Light-background logo plus inverse version if needed |
| Benefits | Explain online learning | Flat teacher/student or laptop illustration |
| Promo card | Balance short copy | Small education/reading illustration |
| Benefits portrait | Human presence | Approved cutout/photo; do not invent identity |
| Three numbered rows | Vary long-page rhythm | Consistent illustration family |
| Instructor invitation | Teaching context | Approved teaching photo/illustration and yellow accents |
| Mentor/value carousel | Card texture | Authentic profiles if supplied; otherwise role-neutral artwork |
| Footer | Distinctive wide silhouette | Original/licensed layered blue mountains, forest, birds; recreate composition with local SVG if appropriate |

Do not hotlink GrowEd's production CDN. Do not ship remote tracking/chat widgets. Use real image dimensions, appropriate `object-fit`, lazy loading below the fold, and a clean fallback. Avoid broken images or empty blocks in final screenshots. Use local data for original marketing/editorial content, never as a substitute for actual courses, reviews, purchases, or progress.

## 8. Other public pages

### 8.1 Services — new `pages/services/index.jsx`

`Observed`: two-column global-learning hero with world-map illustration, a four-part elevated metric strip, benefits section, testimonials, tutor imagery, a group-learning section, a three-step process, FAQs, footer.

`Adaptation`: retain these composition types using StudyNotion capabilities. Place actual category discovery prominently after the hero so visitors can enter the existing catalog. Replace unsupported numerical claims with four short capability labels. Replace live group-session claims with course-learning information. Use the existing review widget. Use a three-step sequence: explore → purchase through secure checkout → learn and track progress.

FAQs are static, accurate product explanations. Accordions must work with keyboard and screen readers. Their answers must not promise live classes, unlimited access periods, refunds, or free content not supported by actual product configuration. A prominent “Find courses” action may open the same presentation-only course finder dialog used elsewhere; it does not book anything.

### 8.2 About — existing `pages/about/index.jsx`

Follow the observed story/mission/inspiration sections with image/text alternation and substantial whitespace. Use current StudyNotion facts; original wording is allowed. Preserve or reorganize `ui/Quote.jsx`, `ui/Stats.jsx`, `ui/LearningGrid.jsx`, and `ui/ContactFormSection.jsx` only where truthful and relevant.

Do not hard-code GrowEd's founder story or create a fictional StudyNotion team. Use in-page expandable story text for “Read more” unless a real local detail page is implemented. Do not link to nonexistent editorial IDs. If a hero asset is unavailable, use a deliberate composed illustration rather than the blank loading area seen during inspection.

### 8.3 Careers — new `pages/careers/index.jsx`

Recreate the blue hero/culture composition: inverse navigation, large white title with a small accent phrase, illustration alongside, followed by three icon-and-copy culture/value blocks and a white benefits section.

This page explains becoming an instructor on StudyNotion. Do not claim salaried openings, employment benefits, paid leave, or a global staff. Primary CTA: existing signup page with clear instructions to choose Instructor. The current signup defaults to Student; do not assume `?role=instructor` already works. If adding presentation-only role preselection, explicitly implement and test it without bypassing actual signup or approval.

### 8.4 Blogs — new `pages/blogs/index.jsx`

Recreate the black featured-story hero with white headline, underline, blue read action, large right-side editorial image. Below it: category pills on white and wide image/text article rows with title, short excerpt, real author/date if known, category, reading time, and link.

There is no verified blog API in this snapshot. Use a small set of original, accurate StudyNotion learning/product guides in a local content module. This is static content, not a CMS. Include at least one complete article so the featured link and detail route are functional. Do not copy GrowEd article bodies. Do not fabricate an author identity or historic publication date. Local category/search interactions must actually filter the local dataset.

Replace unsupported newsletter signup in the hero with a compact course-discovery action that fills a similar amount of space. Never toast “Subscribed” without a real subscription service.

### 8.5 Article — new `pages/blog-article/index.jsx`

Observed reading layout: white header; breadcrumb; article column around 60%; right sidebar around 35%, with search, topic pills, related articles, and social/support area. Article column has heading, rounded hero image, metadata, then readable body and subheads.

Target: 680–740px readable article column at desktop; sidebar stacks below content on mobile. Reuse `SafeMarkdown` for body text. Its current renderer excludes images, so render an approved hero asset as a separate React image; do not loosen markdown sanitization. Sidebar search links/filtering must work against local content. Unknown article slugs show 404 instead of an empty article.

### 8.6 Contact — existing `pages/contact/index.jsx`

Follow the reference's blue identity-card composition on the left and white form on the right. Reuse `features/contact-support/ui/ContactUsForm.jsx` rather than inventing a GrowEd payload.

Verified form fields: `firstname`, optional `lastname`, `email`, `countrycode`, `phoneNo`, `message`. Existing handler: `submitContactForm()` → `sendContactMessage(data)` → `POST /api/v1/reach/contact`.

Keep these field keys, existing validations, loading/disabled behavior, server failure display, and reset only after success. Prefer the existing first/last-name fields rather than an unreliable full-name split. A reference-style “Query type” selector is optional presentation state; if included, append its readable value to the existing message body, without introducing a new server field. Do not remove required phone/email fields to achieve a closer visual copy.

Use existing configured support identity. Do not transplant GrowEd's address, company name, phone, or social URLs. A floating “Contact us” pill may route here; it must not pretend to be live chat.

### 8.7 Footer and legal

Reference footer is a major visual feature: layered blue landscape silhouette above a dark blue base; upper horizontal CTA band; thin separator; social/copyright block plus website/company/contact columns; small yellow heading underlines.

Restyle `widgets/footer/ui/Footer.jsx` and its `model/links.js`. Populate real internal links, including all four current legal pages. Keep actual legal identity/configuration. Replace newsletter inputs with “Explore courses” and a working `/services` link. A prominent CTA row with similar geometry is an explicit backend-constrained adaptation.

Legal pages retain their existing documents and policy configuration, with a narrow readable column, breadcrumb/title, section spacing, and optionally an in-page table of contents. Never substitute GrowEd terms or refund promises.

## 9. Catalog and course details

### 9.1 Catalog

Restyle the existing `Catalog`, `CatalogHero`, and `CatalogSkeleton` in `pages/catalog/index.jsx`. Use a pale hero, blue title accents, white search/filter panel, category identity, result area, and image-led cards.

Preserve:

- `useGetCatalogCategoriesQuery()` and category resolution.
- `useGetCoursesInfiniteQuery()` and the current query-key behavior.
- Committed filters in URL versus draft form state; submit/apply, clear, sort, back/forward restoration.
- Current fields: `q`, `level`, `language`, `minPrice`, `maxPrice`, `minRating`, `minDurationSeconds`, `maxDurationSeconds`, `sort`.
- Sort values: `newest`, `relevance`, `price_asc`, `price_desc`, `rating_desc`, `popular`.
- Existing level values `beginner/intermediate/advanced`, language values `en/hi`, and duration presets.
- `CATALOG_PAGE_SIZE = 12`, opaque cursor pagination, deduplication, “load more” behavior, and previously loaded results during pagination errors.
- Contract parsing and safe error presentation. Distinguish unavailable category data, unknown category, no matching courses, initial failure, and pagination failure.

Target layout: search above the results; tidy filter controls, optionally left rail on wide screens; 3-column cards when space permits, 2 at tablet, 1 on narrow screens. Mobile filters become a labelled disclosure or drawer with Apply/Clear. Do not silently switch all filters to immediate requests or client-side filtering of only one page.

Reuse `entities/course/ui/CourseCard.jsx` (`Course_Card`) and its existing public export. It already accepts v2 and legacy properties (`id/_id`, `name/courseName`, `thumbnailUrl/thumbnail`, rating forms). Keep that compatibility. The similarly named `pages/home/ui/CourseCard.jsx` is a separate component; do not accidentally substitute it as the domain card.

### 9.2 Course details

Restyle `pages/course-details/index.jsx` and `ui/CourseDetailsCard.jsx`:

- Pale-blue title/breadcrumb section, thumbnail or preview image, instructor, real rating/enrollment data.
- Main content: description, learning outcomes, curriculum accordions, instructor information, reviews.
- Right purchase card: actual price, included content information supported by data, policy checkbox/config state, Buy/Add-to-cart controls.
- Sticky purchase card only if it fits the viewport and does not obscure consent/errors; stack naturally on mobile.
- Preserve `fetchCourseDetails(courseId)`, response handling, `handleActive()`, `handleBuyCourse()`, `handleAddToCart()`, `fetchCheckoutConfig()`, and their role/policy branches.
- Keep `SafeMarkdown`, `CourseAccordionBar`, review helpers, and all no-data/error states.
- Do not add fake discounts, coupon boxes, subscriptions, trial bookings, certificates, downloadable resources, or unlocked video previews.

## 10. Authentication, profile, and dashboard shell

These screens are **adaptations using the observed GrowEd design system**. They are not claims about GrowEd private screens.

### 10.1 Authentication suite

Use a light split layout: StudyNotion brand and education illustration/text on one side, clear white form card on the other. Mobile stacks a compact introduction above the form. Apply it to login/signup/OTP/recovery/reset, with appropriately sized cards.

Primary files: `features/authentication/ui/Template.jsx`, `LoginForm.jsx`, `SignupForm.jsx`, `VerificationCodeInput.jsx`, `GoogleSignInButton.jsx`, `PolicyAcknowledgement.jsx`, plus corresponding `pages/*/index.jsx`.

Keep existing field names, password visibility actions, inline validation, form handlers, Google configuration behavior, policy consent, OTP paste/backspace/resend behavior, and pending/signup states. `SignupForm` dispatches `setSignupData()` then `sendOtp()`; verification is not a new one-step registration. Do not convert the flow into phone/WhatsApp signup to resemble GrowEd's booking card.

Retain mandatory policy acceptance at `/accept-terms`. Do not visually de-emphasize or pre-check consent. Session bootstrap and guard loading screens must match the light theme without redirect flashes.

### 10.2 Dashboard shell

Restyle `pages/dashboard/index.jsx`, `widgets/dashboard-sidebar/ui/Sidebar.jsx`, `SidebarLink.jsx`, and `widgets/dashboard-sidebar/model/links.js` without changing role filtering.

Target: white top bar, 240–264px sidebar on wide screens, pale blue/neutral content background, white operational cards with 20–24px padding. Active sidebar item: light-blue fill, blue icon/text, subtle marker. Settings/logout remain accessible. Mobile: modal drawer with keyboard/focus support. Do not show the giant marketing footer inside work/learning layouts.

Page header: title, short context if useful, and one relevant existing primary action. Avoid decorative cards that displace real tools. Admin tables may be denser than marketing cards but must use the same colors, typography, controls, and error system.

### 10.3 Profile/settings

Existing profile display becomes a clean identity card and readable personal information groups. Settings uses clear sections for profile image, editable details, password/security, and account deletion.

Keep `features/profile-settings/ui/ChangeProfilePicture.jsx`, `EditProfile.jsx`, authentication `UpdatePassword.jsx`, `DeleteAccount.jsx`, and Google reauthentication behavior. Preserve upload previews/cleanup, actual editable fields, password validation, confirmation language, and deletion-pending restrictions. Visually separate destructive actions; do not add unsupported notification preferences or settings switches.

## 11. Student learning and commerce

### 11.1 Enrolled courses

Existing `pages/enrolled-courses/index.jsx` uses `getUserEnrolledCourses()` and `getFirstLessonPath(course)`. Rework its rows into readable white course cards or responsive rows with thumbnail, title, duration, status, progress, and Continue action.

Keep purchased courses visible even when their public listing later becomes Draft/Archived. Do not use the public catalog response as the user's enrollment list. A course without lessons keeps its coming-soon message and disabled navigation. Do not fabricate a “resume last watched timestamp”: the existing helper chooses a lesson path, and no new resume backend is authorized.

Any summary number must be derived from the loaded data and labelled accurately. No fake streaks, calendar, AI coach, assignments, certificates, or upcoming live classes.

### 11.2 Learning player

Files: `pages/learning/index.jsx` (`ViewCourse`), `pages/lesson/index.jsx`, `features/lesson-playback/ui/VideoDetails.jsx`, and `widgets/curriculum-panel/ui/VideoDetailsSidebar.jsx`.

Target: light learning workspace; white curriculum rail around 300–320px; blue selected lesson; main lesson title, 16:9 video, existing completion/previous/next controls, description, and review action. Keep the actual video area black for proper media contrast. Mobile curriculum drawer must preserve dismissal and focus return.

**Preserve this real flow:** route IDs → `useGetLearningCourseQuery(courseId)` → curriculum/progress DTO → `Outlet` context → selected lesson in `VideoDetails` → separate `getLessonPlaybackUrl(courseId, subSectionId)` → native video → existing completion action → `useMarkLessonCompleteMutation()` → server-confirmed cached progress.

Do not:

- Persist signed video URLs in localStorage, Redux, static markup, or marketing previews.
- Move to the legacy learning slice/adapters because their names look simpler.
- Treat a purchase status or locally stored enrollment flag as playback authorization.
- Automatically mark complete when opening a lesson or before the server accepts it.
- Remove retry/renewal logic, saved playback position during renewal, native controls, `playsInline`, or lesson-membership checks.
- Add fake notes, discussions, downloads, or quizzes.

Keep different states for course loading, denied access, no curriculum, invalid lesson path, video loading, playback failure/retry, completion pending/failure/success, first lesson, last lesson, and already-completed lesson. The currently verified player only exposes its completion action under its existing end-state conditions; preserve those conditions.

### 11.3 Cart and checkout

Restyle `features/course-purchase/ui/Cart.jsx`, `RenderCartCourses.jsx`, `RenderTotalAmount.jsx`, and `CheckoutPolicyAcknowledgement.jsx`.

Target: image/title/price course rows, accessible remove action, right-hand order summary with actual total and consent. Mobile stacks the summary after items. Preserve cart persistence/reducer behavior and empty-cart navigation.

**Preserve:** `BuyCourse()` → policy/config validation → existing idempotency key → backend order → Razorpay checkout → server verification → confirmed enrollment → cart reset and redirect. Razorpay's hosted checkout is external and is not part of the GrowEd page replication. Do not replace it with a mock payment modal or change its orchestration module for appearance.

Course/catalog prices are major INR; purchase amounts are integer paise. Reuse existing display helpers; avoid 100× errors. No client-only discounts, invented totals, or “success” from a provider-close event.

### 11.4 Purchases/refunds

Restyle `pages/purchase-history/index.jsx` using white cards/table, clear statuses, dates, amounts, purchased items, and existing pagination. Preserve `fetchPurchaseHistory()`, `requestPurchaseRefund()`, and presentation helpers under `entities/purchase/lib/paymentPresentation.js`.

The refund reason remains 10–1000 characters and current eligibility/confirmation semantics remain intact. A requested refund is not a completed refund. Keep server-confirmed states and failure/retry UI. Do not invent a refund window; it depends on real checkout/purchase policy data.

## 12. Instructor and admin screens

### 12.1 Instructor dashboard and courses

Restyle `pages/instructor-dashboard/index.jsx`, `ui/InstructorChart.jsx`, `pages/instructor-courses/index.jsx`, and `ui/CoursesTable.jsx`.

Use existing `getInstructorData()` and `fetchInstructorCourses()` output. Present real totals with correct names, a readable light-theme chart, and existing course actions. Do not turn generated course totals into payout/bank balance or invent analytics. Preserve no-data charts and Draft/Published/Archived distinctions.

### 12.2 Authoring

Maintain the three existing stages: **Course Information → Course Builder → Publish**.

Files under `features/course-authoring/ui/`:

- `AddCourse/index.jsx`, `AddCourse/RenderSteps.jsx`, `EditCourse/index.jsx`.
- `AddCourse/CourseInformation/CourseInformationForm.jsx`, `ChipInput.jsx`, `RequirementsField.jsx`.
- `AddCourse/CourseBuilder/CourseBuilderForm.jsx`, `NestedView.jsx`, `SubSectionModal.jsx`.
- `AddCourse/Upload.jsx`, `AddCourse/PublishCourse/index.jsx`.

Target: blue numbered stepper, white form surface, clear grouped labels, compact tips panel, readable section/lesson cards, distinct upload drop zones, and consistent bottom actions. On mobile the stepper must not overflow and modals must scroll within the viewport.

Preserve actual form data, validation, uploaded media, nested section/lesson IDs, multipart serialization, edit-state hydration, publishing validation, and lifecycle actions. Do not add language/level authoring controls merely because those filters exist in the catalog; the snapshot does not establish the corresponding normal authoring inputs. Do not silently fix the documented category object/string comparison while reskinning.

### 12.3 Instructor approvals

Restyle `features/instructor-approval/ui/InstructorApprovals.jsx`. Use readable application rows/cards with identity, submitted date, role status, approve/reject actions, rejection input, and pagination.

Keep `fetchPendingInstructors()`, `approveInstructor()`, `rejectInstructor()`, per-row pending state, and minimum rejection-reason validation. Approval is not automatic signup. Preserve the Admin route guard.

### 12.4 Payment reconciliation

Restyle `features/payment-reconciliation/ui/PaymentReconciliation.jsx` with a dense but legible white table/list, status badges, detail/action panel, review note, and current confirmation/override controls.

Keep `fetchPaymentReconciliation()`, `resolvePaymentReconciliation()`, `getRefundDeadline()`, `requiresRefundWindowOverride()`, server states, pagination, and all action eligibility rules. Do not introduce a generic one-click “refund complete” UI or remove explicit override/reason fields to simplify the screen.

## 13. New feature mismatch decisions

These are deliberate decisions, not unfinished implementation tasks:

| GrowEd element | Existing StudyNotion capability | Required handling |
| --- | --- | --- |
| Phone-based free-class booking | No verified booking API | Same compact form-card composition, actual category/search finder instead |
| Live tutoring/groups | Recorded course learning and protected media | Accurate course-learning copy and existing routes |
| Career counseling/library finder | No verified support | Replace visual slots with supported learning benefits; no fake destinations |
| PDF roadmap offer | No supplied roadmap file | Course-discovery promo; do not render a dead Download button |
| Newsletter form | No verified subscription endpoint | Discovery CTA in same visual area; no contact-API misuse for subscriptions |
| Live chat bubble | Contact form exists | “Contact us” link; no chat claim or third-party widget |
| Staff/tutor profiles | Course/public data may contain limited instructor info | Show only available verified fields; otherwise non-personal value cards |
| Testimonials/statistics | Real review endpoint; limited counts | Real reviews/valid derived values; no imported social proof |
| Discounts/urgency | No equivalent verified offer system | Neutral CTA; no fake scarcity or client-side price changes |
| Blog/Careers content | No verified CMS or hiring API | Complete frontend-only static pages with truthful original content |

If the owner later wants actual bookings, subscriptions, live tutoring, or a CMS, list these as a separate backend project. Do not implement them under this UI-only brief.

## 14. Suggested component and file work map

Prefer small cohesive components. Names below marked **new** are proposals, not claims that files currently exist.

| Responsibility | Existing edit targets / proposed addition |
| --- | --- |
| Tokens/typefaces | `apps/web/src/shared/styles/globals.css`; approved font assets under existing asset conventions |
| UI primitives | `shared/ui/Button.jsx`, `LinkButton.jsx`, `IconBtn.jsx`, `FormField.jsx`, `ConfirmationModal.jsx`, `StatusPanel.jsx`, `PageLoadingFallback.jsx`, `HighlightText.jsx` |
| Root surface | `widgets/app-shell/AppShell.jsx`; verify toast presentation in `app/providers/AppProviders.jsx` |
| Navigation | `widgets/navbar/ui/Navbar.jsx`, `widgets/navbar/model/links.js`, authentication `ProfileDropdown.jsx` |
| Footer | `widgets/footer/ui/Footer.jsx`, `widgets/footer/model/links.js` |
| Home | `pages/home/index.jsx`; new page-local section components under `pages/home/ui/` |
| Reusable marketing regions | **new** `widgets/marketing/ui/SectionShell.jsx`, `MarketingHeading.jsx`, `FeatureSplit.jsx`; expose public entry if adopted |
| Course finder | **new** `widgets/course-finder/ui/CourseFinder.jsx`; compose existing catalog/filter exports; no raw transport |
| Public pages | Existing about/contact/legal plus **new** `pages/services/index.jsx`, `pages/careers/index.jsx`, `pages/blogs/index.jsx`, `pages/blog-article/index.jsx` |
| Editorial data | **new** `entities/editorial/model/articles.js` + public export for both blog pages; static original content only |
| Reference illustrations | **new** local assets grouped by role under `shared/assets/`; document provenance |
| Courses/reviews | Existing domain course card/accordion/rating components and `widgets/review-slider/ui/ReviewSlider.jsx` |
| Workspace navigation | Dashboard page/sidebar files and curriculum panel listed above |
| New routes | `app/router/AppRouter.jsx`, extending route parity tests; all existing guard wrappers preserved |

Do not create a second Redux store, duplicate session bootstrap, replace providers, fork API clients, or mount a parallel application root.

## 15. Responsive, accessible, and interaction requirements

The following are **target behavior**, to be compared with live mobile reference screenshots when available.

| Width | Public layout | Operational layout |
| --- | --- | --- |
| 360–430px | Single column, 24px gutters (16px only where needed), drawer nav, stacked forms, compact headings | Single-column cards/forms, scrollable table wrapper or labelled stacked records, drawer sidebars |
| 768px | 32px gutters, selective two-column sections, 2-column grids | 2-column metrics where usable; no crushed forms |
| 1024px | Desktop-like sections with 64px vertical rhythm | Sidebar only where enough content width remains |
| 1366–1440px | 1280px max outer section, 64px horizontal/80px vertical section padding | Stable rail + content; readable maximum widths |
| 1920px | Centered sections with capped text/card widths | Do not stretch forms or text edge-to-edge |

- Use natural content heights. Do not reproduce coordinates with absolute positioning for normal text/forms.
- Update every `calc(100vh - 3.5rem)` assumption if the header changes from 56px to the reference's ~80px. Prefer `var(--sn-header-height)` and appropriate dynamic viewport units.
- Ensure nested scroll regions in the player/sidebar are intentional. No trapped mobile scroll or offscreen submit buttons.
- Keyboard: menus, dropdowns, modal close, accordions, filters, carousels, table actions, OTP, and player navigation.
- Visible blue focus ring, contrast checks, real labels, heading hierarchy, useful alt text, `aria-current`, `aria-expanded`, `aria-busy`, and announced status/error messages.
- Buttons only perform actions; links navigate. Avoid nested interactive elements.
- Use 150–220ms restrained hover/focus transitions. No scroll-jacking, cursor glow, excessive rotation, perpetual bounce, or heavy parallax.
- Touch targets at least 44px where practical. Use actual text alongside important status colors.
- Carousels must not hide all content when data is sparse, break layout at one item, or duplicate fake items for looping.
- Respect `prefers-reduced-motion`; no forced autoplay. Preserve native video capabilities.

## 16. Implementation sequence

### Phase 1 — Read and establish the baseline

1. Read project instructions/AGENTS files and the supplied context hierarchy.
2. Inspect source for the listed routes/components. Confirm live branch changes versus the snapshot.
3. Record task baseline and create an isolated working branch if appropriate without discarding user changes.
4. Run the existing app using its current configuration; never fabricate secrets. Record which role/data states are available.
5. Inspect reference at desktop/mobile where possible; create a local comparison matrix. Capture stable section screenshots, not loading placeholders.
6. Inventory local assets and actual fields; record unsupported reference features using section 13.

### Phase 2 — Foundation and shared shell

1. Add typefaces, semantic colors, section spacing, control/card styles.
2. Update root surface, navbar, mobile menu, footer, and shared status/dialog components.
3. Migrate the separate catalog theme alongside the shared theme.
4. Check homepage, login, catalog, and one dashboard at narrow/wide widths to catch global contrast problems early.

### Phase 3 — Public structure

1. Rebuild all fourteen homepage regions in sequence.
2. Implement Services category discovery and the functional course finder.
3. Restyle About/Contact/Legal.
4. Add truthful static Careers, Blogs, and Article routes with working content/navigation.
5. Add compatibility aliases and preserve all original routes.

### Phase 4 — Discovery/auth/commerce

1. Restyle catalog, course cards, filters, detail page, and curriculum.
2. Apply auth design to every auth/policy state.
3. Restyle cart/checkout acknowledgement and purchase/refund history.
4. Verify source-level contracts and run relevant existing regressions.

### Phase 5 — Full authenticated application

1. Dashboard shell, profile, settings, enrolled-course library.
2. Learning layout, lesson video, curriculum drawer, review modal.
3. Instructor dashboard, course list, create/edit wizard, nested modals.
4. Admin instructor approvals and payment reconciliation.
5. Theme all pending/empty/error/denied/global fallback states.

### Phase 6 — Compare and verify

1. Compare reference and redesigned public screenshots at equivalent dimensions.
2. Fix composition, font metrics, spacing, image cropping, and section order before decorative polish.
3. Audit every route and responsive state; confirm actual destinations and controls.
4. Run relevant automated checks below, preserve functional test assertions, and inspect task diff for forbidden changes.
5. Report files changed, tested flows, visual differences required by backend constraints, and any remaining concrete blockers.

Do not stop after Phase 3 and describe the whole application as complete.

## 17. Validation and acceptance

### 17.1 Existing commands verified from the supplied root manifest

Use Node 24 as declared by the repository. Confirm scripts remain current in the actual checkout.

```bash
npm run dev:web
npm run build:local
npm run typecheck
npm run architecture:check
npm run lint
npm run test:frontend
npm run test:e2e -- e2e/catalog.spec.js e2e/learning.spec.js
```

Run development server separately from finite checks. Browser tests require their configured browser/server prerequisites. `build:local` is the development build path; `npm run build` also performs public environment validation. Do not edit environment validators to get a green build. Do not run repository-wide autoformat that rewrites unrelated backend files.

Existing useful tests include:

- `apps/web/src/app/router/AppRouter.parity.test.jsx`.
- `apps/web/src/widgets/navbar/ui/Navbar.test.jsx`.
- `apps/web/src/pages/catalog/Catalog.test.jsx`.
- `apps/web/src/entities/course/ui/CourseCard.test.jsx` and `CourseAccordionBar.test.jsx`.
- `apps/web/src/features/authentication/ui/LoginForm.test.jsx`, `Template.test.jsx`, and `VerificationCodeInput.test.jsx`.
- `apps/web/src/pages/policy-acceptance/PolicyAcceptance.test.jsx`.
- `apps/web/src/pages/learning/LearningPage.test.jsx`.
- `apps/web/src/features/lesson-playback/ui/VideoDetails.test.jsx`.
- `apps/web/src/widgets/curriculum-panel/ui/VideoDetailsSidebar.test.jsx`.
- `apps/web/src/pages/purchase-history/PurchaseHistory.test.jsx`.
- `apps/web/src/features/payment-reconciliation/ui/PaymentReconciliation.test.jsx`.
- `apps/web/src/shared/ui/ConfirmationModal.test.jsx`.

Update assertions only when intentional presentation changes require it. Never delete role/security/contract checks to make the new layout pass. Add focused tests for genuinely new route aliases, course finder navigation, mobile drawer behavior, and local article routing. Do not create tests that only assert arbitrary CSS class strings.

### 17.2 Required visual comparisons

| Check | Pass condition |
| --- | --- |
| Desktop home above fold | Correct light hero, left headline/CTA/value cluster, right compact form, next blue band visible at comparable scale |
| Full home scroll | All fourteen regions in intended order, alternating background rhythm, final illustrated footer |
| Public siblings | Services follows hero/features/steps/FAQ hierarchy; Careers blue variant; Blogs black hero; article readable with sidebar |
| Design consistency | No accidental beige catalog, old dark form, yellow primary button, or dark fallback left in light layouts |
| Navigation | Correct active indicator, full mobile menu, original auth/cart/dashboard controls retained |
| Assets | No broken images, hotlinks to GrowEd, unlicensed copied identity, or blank loading regions in final capture |
| Mobile | No overflow at 360px, accessible forms/drawers, readable titles, footer stacks sensibly |
| App screens | Every existing route in section 6.3 checked in applicable role and meaningful states |

### 17.3 Required functional checks

1. Guest can navigate all public pages and real categories; invalid category/article/course routes recover gracefully.
2. Course finder handles loading/error/empty and navigates with a real slug and correctly encoded query.
3. Catalog filtering, sorting, clear, URL navigation, pagination, failure retry, and image fallback still work.
4. Login/signup/OTP/Google (when configured)/password recovery/policies retain existing behavior and guards.
5. Signed-in sessions restore correctly; logout clears private state; forbidden roles stay blocked.
6. Cart add/remove/persistence and checkout-policy loading/acceptance work. Payment failure/dismissal and verified success are covered using existing mocks or an explicitly configured test environment. Do not transact with production money for visual QA.
7. Purchase/refund and reconciliation displays use correct money units, statuses, eligibility, notes, and confirmations.
8. Enrolled courses keep archived/draft purchased content visible; no-lessons states remain safe.
9. Learning access errors, lesson navigation, signed playback retry, completion confirmation, progress updates, and review modal remain operational.
10. Instructor creation/editing/publish and nested upload/modal workflows retain their actual payloads and behavior.
11. Admin approvals/rejections and reconciliation retain role checks and existing validation.
12. Contact submits the existing shape and displays a true success or failure; newsletter/chat/booking never simulate success.
13. Keyboard focus, reduced-motion behavior, contrast, mobile scroll, and error announcements are checked.
14. Task diff leaves frozen paths unchanged; no secrets, payment data, or protected media URLs appear in screenshots/logs.

Use mocks/fixtures for states unavailable in the local setup, and clearly identify them. An unavailable provider or private test account is a verification limitation, not permission to remove that feature or claim it passed. Historical test counts in project context are not current redesign results.

### 17.4 Completion report template

```text
Implemented:
- Public pages and navigation:
- Student screens:
- Instructor screens:
- Admin screens:
- Shared components and assets:

Verified:
- Commands run and actual outcomes:
- Desktop/mobile widths checked:
- Role/flow checks performed:

Preservation:
- Task-authored backend/contract changes: none
- Existing route and API behavior retained:

Reference adaptations:
- Booking/newsletter/chat and other unsupported features:
- Screens inferred because GrowEd private/mobile states were unavailable:

Remaining blockers (only if real):
- Exact screen/flow, reason, and next verification step:
```

## 18. Ready-to-use instruction for the implementation agent

> Read this entire brief and the StudyNotion project sources before editing. Implement the complete GrowEd-based UI/UX redesign in my existing StudyNotion repository. Follow the public page structure and measured visual details here, and extend the same design system across every existing auth, student, instructor, admin, commerce, and learning screen. Keep StudyNotion branding and real data. Preserve all backend code, contracts, existing API modules, session/role authority, payment orchestration, and learning behavior. Add only the explicitly described frontend marketing routes and presentation components. Use actual source paths, preserve working handlers and route guards, and do not invent unsupported live booking, subscriptions, chat, analytics, discounts, or learning features. Work through all phases, compare desktop/mobile screenshots, run relevant existing checks, and deliver a concrete completion report with evidence and any genuine limitations. Do not stop at a homepage mockup or ask me to choose routine styling details already specified here.

