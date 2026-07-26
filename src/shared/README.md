# Shared frontend primitives

`shared` contains domain-neutral code that can be reused by any frontend
layer. It must not import from `entities`, `features`, `widgets`, `pages`, or
`app`.

- `api` owns the cookie-aware HTTP client, endpoint configuration, and safe
  response-error presentation.
- `ui` owns reusable UI primitives and application error/loading states.

Legacy files under `src/services` and `src/components` re-export these modules
until their consumers migrate. Those adapters are compatibility boundaries,
not alternate implementations.
