# Pages

Pages are route-level compositions. They assemble widgets, features, entities,
and shared primitives and expose route components to `app/router`.

Pages may own route-specific presentation and loading/error states, but reusable
business actions belong in features and stable business concepts belong in
entities. A page must not call Axios or the shared HTTP client directly.
