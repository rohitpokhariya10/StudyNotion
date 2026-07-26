# Application composition

This directory owns startup wiring only: provider order, the singleton Redux
store, session bootstrap, route registration, and the top-level application
component. Product behavior belongs below this layer.

Allowed dependencies flow from `app` to `widgets`, `features`, `entities`, and
`shared`. Existing page and component imports inside `router/AppRouter.jsx` are
temporary compatibility edges that preserve the public route tree while each
vertical slice is migrated independently.

The root `src/main.jsx`, `src/App.jsx`, and `src/store.js` files remain stable
adapters for existing tooling and imports.
