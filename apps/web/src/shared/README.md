# Shared frontend primitives

`shared` contains domain-neutral code that can be reused by any frontend
layer. It must not import from `entities`, `features`, `widgets`, `pages`, or
`app`.

- `api` owns the cookie-aware HTTP client, endpoint configuration, and safe
  response-error presentation.
- `ui` owns reusable UI primitives and application error/loading states.
- `hooks`, `lib`, `config`, `assets`, and `styles` remain business-agnostic.

Page and UI code must not import Axios or the raw HTTP client. Requests belong
behind the owning feature/entity API boundary.
