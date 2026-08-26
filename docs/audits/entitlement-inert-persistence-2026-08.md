# Entitlement inert persistence evidence — August 2026

## Scope

This slice implements Stage 1 of
[ADR 0010](../architecture/0010-entitlement-migration-design.md): the inert
`Entitlement` and private `EntitlementOperationAudit` persistence contracts,
their pure state policies, declared indexes, and tests.

The application does not import either model into a request path. There is no
Entitlement payment/refund writer, authorization reader, API, backfill,
CourseProgress migration, cache, or compatibility-mirror mutation. Existing
Student access continues to use the legacy authority described in ADR 0010.
Both new collections may therefore remain empty after deployment.

## Persisted state and policy

One Entitlement is one Purchase-backed Student/Course grant episode. The only
lifecycle transitions are:

```text
provisioning -> active
provisioning -> cancelled
active       -> revoked
```

`revoked` and `cancelled` are terminal. Only a schema-valid `active` record
with `isCurrent: true` is classified as access-granting by the pure policy; no
runtime authorization uses that classification in this slice.

The model records the ADR-approved explicit revision, bounded reconciliation
attempt/schedule/lease fields, manual-review evidence, deterministic
replacement decision/outcome fields, migration provenance, and terminal domain
timestamps. It stores no email, name, provider payload or identifier, token,
cookie, media URL, progress data, or free-form payment history.

The private operation audit permits only a one-way
`requested -> succeeded|failed|conflict` finalization. Operator identity and
bounded reason are excluded from default queries and normal serialization.
Entitlement replacement, recovery, manual-correlation, and migration fields
receive the same default-query and serialization protection required by the
ADR.

## Additive indexes

The controlled `db:indexes` registry creates only these new named indexes and
continues to use `createIndexes()` rather than `syncIndexes()`:

### Entitlement

- `unique_entitlement_purchase_course` — unique `{ purchaseId, courseId }`
- `unique_current_entitlement_student_course` — unique
  `{ studentId, courseId }` where `isCurrent: true`
- `entitlement_student_status_course` — `{ studentId, status, courseId }`
- `entitlement_course_status_student` — `{ courseId, status, studentId }`
- `entitlement_stale_provisioning` —
  `{ status, nextReconciliationAt, _id }`, partial on `provisioning`
- `entitlement_expired_reconciliation_lease` —
  `{ status, reconciliationLeaseUntil, _id }`, partial on `provisioning`
- `entitlement_migration_run` — `{ migrationRunId, _id }`, partial on a string
  migration ID

The current-pair index reserves both `provisioning` and `active` episodes. A
terminal episode clears `isCurrent`, so it remains as history without blocking
a later Purchase-backed episode.

### EntitlementOperationAudit

- `unique_entitlement_operation_id` — unique `{ operationId }`
- `unique_open_entitlement_operation` — unique `{ entitlementId, status }`
  where `status: requested`
- `entitlement_operation_history` — `{ entitlementId, requestedAt: -1 }`
- `entitlement_operator_history` — `{ actorId, requestedAt: -1 }`

## Verification boundary

The guarded integration test uses only a local or CI MongoDB database named
`studynotion_entitlement_test_*`, rejects production/SRV/multi-host targets,
and requires MongoDB major version 8. It executes the real controlled index
script twice, then verifies lifecycle persistence, privacy projections,
episode/current uniqueness under races, revision-CAS feasibility, one-open
operation behavior, one-time audit finalization, exact index definitions, and
hinted execution plans. The fixture is query-shape evidence, not a
production-cardinality benchmark.

Production preflight is unchanged. It remains a read-only data gate that runs
before controlled index creation and must not fail merely because the new
collections are empty or not yet created.

Run the focused database check with Node 24 and disposable MongoDB 8:

```bash
STUDYNOTION_RUN_ENTITLEMENT_INTEGRATION=1 \
ENTITLEMENT_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/studynotion_entitlement_test_local \
node --test apps/api/test/entitlement-models.integration.test.js
```

On 11 August 2026 this command ran locally with Node 24.19.0 against disposable
MongoDB 8.0.26 and passed both tests with zero skips or failures. The test
dropped only its guard-validated database before and after the run. Its hinted
execution plans and small fixture demonstrate index/query shape, not production
cardinality or optimizer choice.

Rollback is code-only: deploy the prior immutable application or review and
revert this slice's commits in reverse order. The additive empty collections
and indexes may remain; do not drop them or restore a database merely to disable
inert code.
