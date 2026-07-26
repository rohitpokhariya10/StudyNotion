# Features

Features orchestrate a user capability from entity and shared primitives.
They must not import from `widgets`, `pages`, or `app`, and one feature must not
reach into another feature's internals.

The session feature currently owns application-session bootstrap and response
state synchronization. Its call to the existing auth operation is a temporary,
documented compatibility edge; auth behavior remains in place until its own
vertical migration.
