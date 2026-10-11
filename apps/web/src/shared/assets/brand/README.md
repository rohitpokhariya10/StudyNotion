# Current logo: Glossy Jelly Blob Duo

The latest supplied `Glossy Jelly Blob Duo.png` supersedes the light-blue-tile version below. Original archived unchanged under `original/Glossy Jelly Blob Duo.png`; its real alpha transparency is retained, with no background removal/redrawing. Both full characters, accents and shadow remain.

Current derivative: `prahit-jelly-duo.webp`, 640×512, from crop x280/y190/w980/h784. Icons use square crop x280/y100/w980/h980. Existing generator now reproduces this source. Current favicon/manifest cache version is `jelly-duo-2`; ICO includes 16/32/48 and app icons retain both characters. Checkout image updated through its existing binary path, payment code unchanged.

Compact sizes: navbar 44px high desktop, 38px mobile; remaining auth/contact panels 80px wide. Login/signup body panels and footer remain logo-free as requested. Historical originals/derivatives are retained without active imports.

## Previous artwork history (superseded)

# Prahit official artwork — Glossy Blob Companions

The user's **Glossy Blob Companions.png** supersedes `best_1.png` and all earlier marks. Both complete glossy characters, their eyes/highlights/relative placement, decorative accents, shadow and light-blue background are preserved. No redraw, recolouring, background removal or new lettering.

- Source: `original/Glossy Blob Companions.png`, copied byte-for-byte from the supplied file. 1448 × 1086; SHA-256 `f32de1d06730b7729bd7a4ba76e5fd660ed35dcb5f173b40e72d26ff2fffcfa5`.
- Shared logo: crop **x=360, y=220, width=800, height=640**, resampled to **640 × 512** as `prahit-companions.webp` (quality 0.96). Source pixels only, retaining the deliberate light-blue tile.
- Social/public `logo.png`: same crop and 640 × 512 dimensions.
- All small/app/checkout icons: square source crop **x=360, y=140, width=800, height=800**. It includes both characters and accents, centered with balanced outer padding. No individual character is isolated.
- Public icons: `favicon-{16,32,48}.png`, `favicon.ico` (embedded 16/32/48 PNG entries), `apple-touch-icon.png` (180), `logo192.png`, `logo512.png`. Manifest purpose is **any**, not maskable; no unverified mask safety claim.
- Metadata and manifest use `?v=companions-1` to prevent stale icon URLs. The public compatibility filenames also contain the new artwork. The old unused PNG-in-SVG wrapper `public/icon.svg` was removed; no raster file is presented as a vector.
- `BrandLogo` uses the new WebP with explicit 640 × 512 intrinsic dimensions and the existing `object-fit: contain` sizing. Navbar 60px high desktop / 48px mobile; panel/auth 140px wide; footer 124px wide. Existing Prahit text/accessible labels remain. A labelled home link hides its decorative image from assistive technology; standalone logos retain alt `Prahit`.
- The protected checkout module continues to import `shared/assets/Logo/rzp_logo.png`; that binary now contains the new square artwork. Payment JavaScript, handlers and metadata are unchanged.

Reproduce derivatives from the repository root using the existing Playwright/Chromium dependency:

```sh
node docs/growed-redesign/artwork/prepare-companions-logo.mjs
```

The generator uses browser Canvas crop/resampling only and writes a standard ICO directory containing PNG images. It never modifies the source. No new dependency or generative-image tool is involved.

## Historical originals retained

`original/best_1.png` (SHA-256 `0bf8deba6943219f0f498e1848d07ec02a22c756dd386738c0ff5e935d757cc4`) and its earlier `prahit-logo.webp` remain as historical assets with no active frontend import. `original/legacy-checkout-logo.png` archives the replaced checkout image. Earlier crop coordinates were x=220, y=325, width=790, height=620; the retired book favicon crop was x=579, y=642, width=142, height=80. Historical screenshots/documentation are retained as evidence, not current branding.

## Placement update — 7 October 2026

Login/signup panels and the footer no longer render the logo, per the latest instruction. Navbar, recovery/verification, contact panels, icons and checkout artwork remain. AuthLayout retains its default logo for other callers; only the login/signup Template opts out. Footer home navigation remains in its Website links.
