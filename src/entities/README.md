# Entities

Entities own client-side representations and transport adapters for stable
domain concepts. They may depend on `shared`, but not on `features`, `widgets`,
`pages`, or `app`.

The catalog entity currently owns the existing RTK Query catalog API without
changing its reducer path, cache policy, query serialization, credentials, or
response parsing. `src/services/catalogApi.js` remains its legacy import
adapter.
