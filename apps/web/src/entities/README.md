# Entities

Entities own client-side representations and transport adapters for stable
domain concepts. They may depend on `shared`, but not on `features`, `widgets`,
`pages`, or `app`.

An entity may expose focused `api`, `model`, `lib`, or `ui` modules when those
responsibilities exist. Do not create empty subdirectories or duplicate schemas
from `packages/contracts` merely to make slices symmetrical.
