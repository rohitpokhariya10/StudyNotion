# Application composition

This directory owns startup wiring only: provider order, the singleton Redux
store, session bootstrap, route registration, and the top-level application
component. Product behavior belongs below this layer.

`app` may compose `pages`, `widgets`, `features`, `entities`, and `shared`.
Nothing below `app` may import its router, providers, or store composition.
Application startup is `app/main.jsx`; frontend-owned configuration remains in
`apps/web`.
