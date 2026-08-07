# ADR 0005: Migrate the declarative SPA to React Router 8

- **Status:** Accepted
- **Date:** 7 August 2026
- **Supersedes:** The temporary Router 6 hold in ADR 0004

## Context

StudyNotion used React Router DOM 6.30.4 with the `v7_startTransition` and
`v7_relativeSplatPath` future flags. The dependency carried known moderate
runtime advisories, while the application had already moved to React 19.2.8,
Vite 8, and Node 24.

The application uses declarative routing through `BrowserRouter`, `Routes`, and
`Route`. It does not use Framework Mode, Data Mode, server rendering,
`RouterProvider`, `HydratedRouter`, multi-segment splat routes, or deprecated
data APIs. Backend CommonJS modules do not import the browser router.

React Router 8 is ESM-only, requires Node 22.22 or newer and React/React DOM
19.2.7 or newer, removes the `react-router-dom` compatibility package, and makes
the former v7 future behavior the default.

## Decision

1. Replace `react-router-dom` 6.30.4 with `react-router` 8.3.0. Import the
   declarative browser APIs from the package root. No `react-router/dom` import
   is needed because the application does not use `RouterProvider` or
   `HydratedRouter`.
2. Remove `v7_startTransition` and `v7_relativeSplatPath` from production and
   test routers because Router 8 no longer accepts those migration flags.
3. Keep the existing route tree, guard composition, redirect destinations,
   history replacement, intended-location state, lazy boundaries, and catch-all
   route unchanged.
4. Retain Node 24, React 19.2.8, Vite 8, and the existing ESM Vite/Vitest
   configuration. Do not introduce a CommonJS bridge or migrate to Router
   Framework/Data Mode as part of this change.
5. Treat routing parity as a release gate. Tests cover public and unknown URLs,
   query/hash preservation, anonymous and bootstrap states, policy gating, role
   boundaries, protected playback, legacy redirects, and authenticated
   open-route redirects.

## Consequences

- The vulnerable Router 6 dependency and the redundant `react-router-dom`
  package are removed from the resolved dependency graph.
- URL and authorization behavior remain compatible; no backend endpoint,
  payload, database schema, cookie, token, payment, entitlement, protected-media,
  or account-deletion contract changes.
- Node versions older than 22.22 cannot install Router 8. StudyNotion's pinned
  Node 24 runtime satisfies that requirement in local development, CI, and
  containers.
- A future adoption of Router Data or Framework Mode requires a separate ADR and
  migration because it would change application ownership and runtime behavior.

## References

- [React Router v8 upgrade guide](https://reactrouter.com/8.3.0/upgrading/v7)
- [Declarative installation guide](https://reactrouter.com/8.3.0/start/declarative/installation)
- [React Router 8.3.0 changelog](https://reactrouter.com/8.3.0/changelog)
