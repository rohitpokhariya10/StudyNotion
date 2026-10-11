# Prahit NEET Mocks — short landing redesign (11 October 2026)

`/neet` was rebuilt as a short page following Pinterest reference B (pin 841891724127722669: the "Family" wallet landing page). The typography follows reference A (pin 203084264442742791). Both images were downloaded from the pins and inspected at full resolution. Only the presentation changed: routes, the catalog API, authentication and the mock engine are untouched.

## Page structure

1. **Header**: brand, Overview, Mock tests, Back to Prahit, and Sign in (or the signed-in account chip). Below 768px the links move into a disclosure menu that closes on Escape, an outside click, or navigation.
2. **Hero**: "Big dreams. / Stronger preparation.", a short description, **Start a Mock** (primary), **Explore Tests**, and a three-step hint. Flat illustration clusters drawn in code flank the copy on desktop and become a band above it on tablet and phone.
3. **Pick today's sitting.**: a live preview of up to three papers, open ones first. It has designed loading, empty, error and retry states and links to `/neet/mocks`.
4. **Preparation with purpose. / Confidence with a foundation.**: a bento of four verified benefits with small product-UI mockups, followed by a Start a Mock call to action.
5. **Footer**: the shared Prahit landscape footer from the homepage (`widgets/footer`), with the NEET non-affiliation notice added as its last row (see "Footer" below).

Page height at 1440 × 900 dropped from 6,289px to about 2,600px; at 390 × 844 it dropped from 10,582px to about 4,450px.

## Start a Mock

- An open paper exists: the link goes to `/neet/mocks/:id/start`. Signed-out visitors meet the existing `PrivateRoute`, which goes to `/login` and returns afterwards. Students land on the real onboarding: details, mode, instructions, checks, then Start test.
- No open paper, while loading, or after an error: the link goes to `/neet/mocks`, which shows the genuine catalog state.
- **Explore Tests** always goes to `/neet/mocks`.

## Removed

The students-at-desk hero image, the floating "A little practice. A bigger future." caption, the blue NEET badge, the lime ribbon, and the subject, practice-mode, results, journey, FAQ and closing sections. Also removed: the subject filter, the `widgets/neet-hero` widget (only this page used it, including the unused helix/WebGL fallback), and the five `shared/assets/neet-prep` images. Those files were never committed; a local backup of them, including the uncommitted edits, is kept outside version control at `docs/neet-redesign/archive/previous-landing-2026-10-11.tar.gz` on the original workstation.

## Typography and visual system

- **Inter Tight Variable** (already installed, SIL OFL) for all landing text. Display weight is 600 with −0.022em tracking; body copy is 17–20px. A global `h1–h3 { font-family: Poppins }` rule is overridden only inside `.pn-landing-page`.
- White canvas, warm neutral surfaces (`#f8f7f4`), a charcoal primary pill, and illustration accents in sky blue, tomato, sunflower and green. Tokens live in `widgets/neet-shell/styles/landingChrome.css`.
- The illustrations are original SVG, with no raster images on the page: a stopwatch, a seedling, a flask and a cell character; an OMR sheet; answer bubbles; a heart with a pulse line; atom, benzene and DNA marks. Characters bob gently on the compositor. All motion stops under `prefers-reduced-motion`.

## Files

- Page: `apps/web/src/pages/neet-landing/index.jsx`, `neetLanding.css`, `NeetLanding.test.jsx`, `ui/LandingHero.jsx`, `ui/HeroArt.jsx`, `ui/OpenPapers.jsx`, `ui/PreparationSection.jsx`
- Shell: `apps/web/src/widgets/neet-shell/ui/ProjectNeetShell.jsx` (the `landing` variant), `ui/NeetLandingChrome.jsx`, `ui/NeetAccountEntry.jsx` (sign-in logic shared with the other NEET pages), `styles/landingChrome.css`
- Tests: `e2e/neet-landing.spec.js` (rewritten); `e2e/project-neet.spec.js` (two locators updated because the page now has two Start a Mock links)

## Review locally

```sh
VITE_API_BASE_URL=http://127.0.0.1:4100/api/v1 npm run build:local
npm run preview --workspace studynotion-web -- --host 127.0.0.1 --port 4173
open http://127.0.0.1:4173/neet
npx playwright test --config playwright.neet-landing.config.mjs
```

Screenshots are in `short-landing/`. The `neet-*-full.png` captures use local sample papers to show the content state; `neet-1440-full-live-empty.png` shows the live API, which currently has no published papers.

## Footer (follow-up, same day)

`/neet` now renders the homepage's footer component itself (`@/widgets/footer`): the same lazy `footer-landscape.svg`, CSS and links, with nothing copied. The page passes it to `ProjectNeetShell` through a new `footer` prop, so the mocks, onboarding and result pages keep their compact footer and don't load this one. The shared `Footer` gained an optional `note` prop, which renders the NEET legal notice under a hairline divider; without a note, the output is unchanged. The homepage footer measured 0 differing pixels before and after at 1440, 820 and 390. Landing font and focus overrides now stop at `.sn-footer`. Before and after captures are in `footer/`.

## Wordmark (follow-up)

The NEET brand is now typographic only. The blue heartbeat mark was removed and `NeetMark` deleted. `NeetWordmark` in `widgets/neet-shell/ui/NeetLogo.jsx` sets "NEET Mocks" in Inter Tight: "NEET" at weight 800 with +0.008em tracking, "Mocks" at 400 with −0.014em, one baseline, in deep charcoal (`currentColor`). The word space is narrowed to about 0.16em so the open foot of the T doesn't read as a gap. The only accent is a restrained blue on "Mocks" when the landing brand link is hovered. The styles live in `styles/wordmark.css` (components layer), and the component imports Inter Tight itself, so it looks the same in the landing header, the shared NEET header (catalog, onboarding, results) and the exam pre-start screen. Sizes are 24px on desktop, 21px on phones and 19px at 320px. The homepage branding is unchanged. Navbar captures, hover and focus states, and the type explorations are in `brand/`.
