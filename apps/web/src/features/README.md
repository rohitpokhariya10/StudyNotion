# Features

Features orchestrate a user capability from entity and shared primitives.
They must not import from `widgets`, `pages`, or `app`, and one feature must not
reach into another feature's internals.

A feature owns an action or use case, not every component associated with a
domain noun. Cross-feature orchestration belongs in a widget/page/app boundary
or in a deliberately extracted entity/shared primitive.
