# ADR 0001: Productize StudyNotion incrementally

- **Status:** Accepted
- **Date:** 20 July 2026

## Context

StudyNotion contains a substantial hardened baseline alongside large legacy
controllers and a tutorial-era frontend. Authentication, authorization,
Razorpay state and reconciliation, protected media, origin/CSRF enforcement,
rate limiting, account deletion, and production validation already encode
important security and operational guarantees.

A repository-wide rewrite would make those guarantees difficult to characterize
and review. The current database also contains compatibility-sensitive arrays and
relationships that must not be destructively migrated as part of initial product
work.

## Decision

Productize the application through small vertical slices on top of the tagged
baseline.

1. Keep the React SPA, Express API, MongoDB, Redis, Razorpay, and Cloudinary
   architecture while introducing boundaries incrementally.
2. Start with the catalog domain because it is public and bounded away from
   payment and identity state transitions.
3. Preserve `/api/v1` behavior while adding validated, explicitly versioned v2
   contracts.
4. Add characterization and integration coverage before extracting behavior from
   a legacy controller.
5. Keep Node 24 as the supported runtime and npm lockfiles as the reproducibility
   source until a separate runtime or workspace migration is accepted.
6. Require security, compatibility, verification, and rollback notes for every
   slice. Database migrations require a separate idempotent plan and approval.

## Consequences

- Changes remain reviewable and can be reverted to
  `pre-productization-2026-07-20` without rewriting shared history.
- Some duplication and legacy structure remain temporarily while each domain is
  migrated.
- New v2 contracts and UI paths must coexist with v1 until compatibility evidence
  supports deprecation.
- Payment, identity, enrollment authorization, and destructive schema work remain
  explicit non-goals for the first catalog slice.
