# Backend module boundary

`server/modules` is the destination for incrementally migrated business
capabilities. Creating this boundary does not move the existing controllers,
routes, models, or provider integrations; those imports remain stable until a
feature has characterization tests and a compatible replacement.

For a migrated feature, dependencies flow inward in this order:

```text
route -> controller -> service/policy -> repository or provider adapter
```

- Routes own Express wiring and boundary validation.
- Controllers map validated HTTP input and output but do not own workflows.
- Services and policies own business rules, authorization decisions, and
  transaction or idempotency boundaries.
- Repositories own Mongoose access and explicit projections.
- Provider adapters own external SDK and network calls.
- Modules may depend on `server/shared` infrastructure, but shared code must
  not import a feature module.
- Existing `/api/v1` handlers remain compatibility adapters until replacement
  routes have contract and end-to-end coverage.

Auth, payments, refunds, entitlements, protected media, account deletion, and
course lifecycle code must not be moved merely to satisfy the directory shape.
Each of those migrations requires its own reviewed vertical slice.
