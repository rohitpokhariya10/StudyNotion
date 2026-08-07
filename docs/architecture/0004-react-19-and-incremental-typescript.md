# ADR 0004: Adopt React 19 with incremental strict TypeScript

- **Status:** Accepted
- **Date:** 7 August 2026

## Context

The first catalog vertical slice was implemented in JavaScript on React 18. The
modernisation target requires a supported React release and a TypeScript
foundation, but a repository-wide language conversion or simultaneous Router,
Tailwind, and Mongoose upgrade would combine unrelated risks.

The previous OTP presentation package declared React support only through React 18. The protected signup API, OTP persistence, throttling, expiration, and
verification behavior did not require changes.

## Decision

1. Upgrade `react` and `react-dom` together to 19.2.8 and install their matching
   type packages.
2. Replace the incompatible OTP presentation package with a local controlled
   six-digit input. Keep the existing signup state, API calls, cooldown, and
   backend verification unchanged. Cover numeric entry, sanitized paste, focus,
   and backspace behavior with component tests.
3. Pin TypeScript 5.9.3 and add a strict, no-emit browser configuration. Existing
   JavaScript remains allowed with `checkJs: false`; every new TypeScript file is
   subject to strict null checks, exact optional properties, unchecked-index
   checks, and isolated-module rules.
4. Convert the Vite/Vitest configuration to TypeScript as the first executable
   typed boundary. Run `npm run typecheck` in root verification and CI.
5. Keep React Router at 6.30.4 for this milestone. Both v7 future flags and the
   isolated provider/router composition are already enabled. The v7 major
   upgrade, including resolution of its two moderate advisories, remains a
   separate migration with dedicated route compatibility tests.

## Consequences

- The catalog and existing role journeys run on React 19 without changing their
  routes, API payloads, state ownership, or visual information architecture.
- Authentication, authorization, sessions, payments, reconciliation, protected
  media, CSRF/origin enforcement, rate limiting, account deletion, and
  production preflight code are unchanged.
- TypeScript adoption can proceed one feature or boundary at a time without a
  repository-wide rewrite. JavaScript files are not falsely presented as
  type-checked.
- Router 7, Tailwind 4, and any later Mongoose major remain independent work and
  must not be bundled into the next vertical slice without their own migration
  evidence.
