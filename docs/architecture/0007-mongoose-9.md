# ADR 0007: Adopt Mongoose 9 without changing stored data

- **Status:** Accepted
- **Date:** 8 August 2026

## Context

StudyNotion previously declared Mongoose `^8.24.1` and resolved Mongoose 8.24.1,
MongoDB Node.js driver 6.20.0, and BSON 6.10.4. The backend now runs on the
repository's Node 24 runtime and its integration environment uses MongoDB 8.0,
so the maintained Mongoose 9 line can be adopted without changing the platform
runtime.

Mongoose 9 changes several APIs and defaults. Relevant changes include its Node
20.19 minimum, rejection of numeric `ObjectId` values, removal of the generated
`background: true` index option, deprecation of `new` and `returnOriginal` update
options, and an explicit opt-in for Mongoose model update pipelines. It also
updates the MongoDB driver and BSON implementation. Changes to callback-style
middleware, document update callbacks, UUIDs, internal schema paths, TypeScript
query types, and several removed connection options are not applicable because
StudyNotion does not use those features.

## Decision

1. Pin Mongoose at 9.9.1. This resolves MongoDB Node.js driver 7.5.0, BSON
   7.3.1, Kareem 3.3.0, and mquery 6.0.0.
2. Replace the 32 production and seed uses of `{ new: true }` with
   `{ returnDocument: "after" }`. These options have equivalent post-update
   document semantics. Preserve every filter, update, projection, validator,
   upsert, compare-and-set condition, populate, and lean operation around them.
3. Keep schema definitions, stored document shapes, connection initialization,
   timestamps, and source index declarations unchanged. Do not add a data
   migration, remove an index, or introduce a transaction boundary.
4. Keep Mongoose model update pipelines disabled. StudyNotion has no model
   update pipeline; the security backfill intentionally uses native
   `Model.collection.updateMany()` aggregation pipelines and does not need the
   Mongoose `updatePipeline` option.
5. Raise the backend's optional `gcp-metadata` dependency from `^5.3.0` to
   `^7.0.1`. MongoDB driver 7.5 declares that optional peer range; retaining
   version 5 leaves an invalid production dependency tree. The lockfile change
   consequently resolves gcp-metadata 7.0.1, gaxios 7.3.0, and node-fetch 3.3.2.
   StudyNotion does not import these packages directly.

## Compatibility boundary

- Numeric values no longer construct or cast as ObjectIds. Public identifiers
  are validated before construction, and malformed identifiers continue to
  produce the established generic client error rather than exposing database
  details. Valid 24-character hexadecimal identifiers remain supported.
- Existing Student, Instructor, and Admin documents remain readable. Missing
  newer default fields are not silently persisted by a read; the existing
  security backfill remains the explicit, idempotent repair mechanism where it
  is still outstanding.
- Local-password and Google-only identity validation remains conditional on the
  existing `authProviders` value. Hidden identity and security fields remain
  excluded unless explicitly selected.
- Course, section, lesson, category, enrollment, progress, rating, and purchase
  references retain their existing populate behavior.
- Unique, sparse, partial, and TTL source index definitions are unchanged.
  Mongoose 9 no longer sends the obsolete generated background option, but
  MongoDB creates the same declared indexes.
- Purchase immutability, payment compare-and-set updates, refunds,
  reconciliation, enrollment, and progress idempotency remain unchanged.
- The application has no Mongoose sessions or transactions. Existing
  standalone-safe compare-and-set, unique-index, lock, and compensation
  boundaries remain intentional; this dependency upgrade does not introduce
  synthetic transactions.

Characterization coverage protects valid and invalid ObjectIds, update
post-images, update validators, duplicate-key details, lean queries, nested
population, aggregation, defaults, hidden fields, legacy document hydration,
course-progress upsert idempotency, purchase immutability and status changes,
index creation, and security-critical index definitions. Protected
authentication, OTP, payment, refund, reconciliation, entitlement, media, and
deletion suites remain release gates.

## Deployment

1. Confirm the production MongoDB server is version 6, 7, or 8 before rollout;
   repository integration verification targets MongoDB 8 only. Confirm the
   production connection topology, TLS/SRV behavior, and authentication
   mechanism separately. In particular, a deployment using `MONGODB-AWS` needs
   the driver 7 AWS credential-provider requirements reviewed explicitly.
2. Take the normal database backup and build an immutable API image from the
   reviewed lockfile with Node 24 and `npm ci`.
3. On a disposable copy when applicable, run the existing security backfill
   twice to prove its idempotence. Run production preflight and controlled index
   creation before serving traffic. No new Mongoose migration script is needed.
4. Canary the image and monitor readiness and connection failures, CastError and
   generic 400 rates, duplicate-key normalization, signup/OTP/login and Google
   identity behavior, purchase and payment reconciliation, refunds,
   entitlements, and course progress.
5. Treat timings from the small integration fixture as smoke evidence, not as a
   production-cardinality performance benchmark. Driver 7 cursor batching can
   change network and memory performance even though StudyNotion has no
   correctness-sensitive cursor stream or change stream.

## Rollback

Prefer routing traffic back to the immutable image built from commit
`6772b89`. For a source rollback, review and `git revert` the Mongoose migration
and its follow-up commits in reverse order; never reset or force-push shared
history. No reverse database migration, index removal, or database restore is
required because this decision changes neither stored schemas nor declared
indexes. Restore a database backup only for a separate data incident.

## Consequences

- The backend uses the current Mongoose 9 API and has a valid driver 7 optional
  peer tree on the supported Node 24 runtime.
- Authentication, authorization, OTP, sessions, policy acceptance, payments,
  refunds, reconciliation, entitlements, protected media, account deletion,
  API contracts, and stored data intentionally retain their prior behavior.
- Production MongoDB version and any Atlas/SRV/TLS/IAM-specific topology remain
  deployment facts to verify; local MongoDB 8 integration does not prove them.

## References

- [Mongoose 9 migration guide](https://mongoosejs.com/docs/migrating_to_9.html)
- [Mongoose `findOneAndUpdate()` semantics](https://mongoosejs.com/docs/tutorials/findoneandupdate.html)
- [Mongoose MongoDB compatibility matrix](https://mongoosejs.com/docs/compatibility.html)
- [MongoDB Node.js driver upgrade guide](https://www.mongodb.com/docs/drivers/node/current/reference/upgrade/)
