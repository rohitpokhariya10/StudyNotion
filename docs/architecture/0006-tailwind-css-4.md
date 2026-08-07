# ADR 0006: Adopt Tailwind CSS 4 through Vite

- **Status:** Accepted
- **Date:** 7 August 2026

## Context

StudyNotion used Tailwind CSS 3.4.19 through a PostCSS configuration with
Autoprefixer. Its JavaScript configuration replaced the default color and font
namespaces with the StudyNotion palette, extended two content widths, and
connected catalog semantic CSS variables to color, radius, and shadow
utilities. The application had no Tailwind plugins or safelist and scanned only
JavaScript and TypeScript files below `src`.

Tailwind CSS 4 uses a CSS-first configuration, a single CSS import, automatic
source detection, and a dedicated Vite integration. It also changes some
Preflight behavior and renames or removes utilities for opacity, shadows,
radii, gradients, blur, and important modifiers. A naive migration would also
restore Tailwind's default colors and make previously unknown legacy classes
active.

## Decision

1. Pin `tailwindcss` and `@tailwindcss/vite` together at 4.3.3 and run Tailwind
   through Vite. Remove the Tailwind-only PostCSS and Autoprefixer setup.
2. Make `src/App.css` the CSS-first entry point with an explicit `src` source
   base. Move the complete StudyNotion color/font configuration, content-width
   extensions, and catalog token mappings into `@theme` blocks. Remove the
   legacy JavaScript Tailwind configuration.
3. Reset Tailwind's default color and font namespaces before defining the
   StudyNotion values. This preserves the Tailwind 3 replacement behavior and
   prevents unknown default-palette utilities from silently becoming active.
4. Keep all existing palette values and catalog runtime variables unchanged.
   Add shared semantic aliases that point to those values; do not replace
   existing component classes or redesign the product in this migration.
5. Replace only the utilities whose Tailwind 4 meaning or syntax changed. Keep
   existing no-op and unknown legacy classes inactive unless a removed utility
   must be deleted for the Tailwind 4 compiler. Retain Tailwind 3's enabled
   button cursor, placeholder color, and default font stack through a small,
   documented base compatibility layer.
6. Treat responsive screenshots, accessibility scans, frontend/backend tests,
   contracts, production builds, and the seeded container journeys as release
   gates. Tailwind's browser floor is Chrome 111, Safari 16.4, and Firefox 128.

## Consequences

- Tailwind configuration now lives beside the global stylesheet and the
  Prettier Tailwind plugin reads that stylesheet explicitly.
- Vite owns CSS import processing and vendor prefixing; there is no second
  PostCSS Tailwind pipeline.
- The build adds Tailwind's native Oxide packages for the current platform, but
  Tailwind still adds no browser JavaScript runtime.
- Authentication, OTP, sessions, payments, refunds, reconciliation,
  entitlements, protected media, account deletion, instructor approval,
  databases, and API contracts are unchanged.
- Supporting browsers older than Tailwind 4's floor would require reverting to
  the Tailwind 3 LTS line or a separately approved compatibility strategy.

## References

- [Tailwind CSS upgrade guide](https://tailwindcss.com/docs/upgrade-guide)
- [Tailwind CSS Vite installation](https://tailwindcss.com/docs/installation/using-vite)
- [Tailwind CSS theme variables](https://tailwindcss.com/docs/theme)
- [Tailwind CSS source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files)
- [Tailwind CSS compatibility](https://tailwindcss.com/docs/compatibility)
