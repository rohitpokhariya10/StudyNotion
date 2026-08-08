# ADR 0008: Add authenticated Learning V2 course progress

- **Status:** Accepted
- **Date:** 8 August 2026

## Context

The student player previously loaded `POST /api/v1/course/getFullCourseDetails`.
That controller checked access and then deeply populated a broad Course document,
loaded raw `completedVideos`, and generated signed media URLs for every lesson.
`ViewCourse` copied the response into the legacy `viewCourse` Redux slice and
calculated the displayed total in the browser. `VideoDetails` separately fetched
a fresh protected playback URL for the active lesson and posted completion to
`/api/v1/course/updateCourseProgress`.

The existing behavior had these important authorities and edge cases:

- `Course.studentsEnroled` authorized both protected playback and progress.
- `CourseProgress.completedVideos` stored ObjectIds and had a unique
  `{ userId, courseID }` index.
- Completion used `$addToSet`, so a sequential repeat did not add another ID.
- A lesson had to be referenced by a Section in the requested Course; a foreign
  lesson returned 404 and a non-enrolled learner returned 403.
- The player displayed the raw completion-array length. A separate enrolled
  course mapper intersected stored IDs with current curriculum IDs and rounded
  progress to two decimal places.
- Protected playback rechecked entitlement and lesson membership, selected
  hidden provider metadata server-side, and returned only a fresh signed URL.

The broad v1 response, duplicated client state, and raw completion count made a
bounded authenticated vertical slice appropriate. Reworking JWT/session,
payments, refunds, enrollment storage, or protected media at the same time would
make the security boundary too large to review safely.

## Decision

1. Keep all v1 routes and bytes compatible. Add:

   - `GET /api/v2/learning/courses/:courseId`
   - `PUT /api/v2/learning/courses/:courseId/lessons/:lessonId/progress`

   The PUT means only “mark this lesson complete.” It accepts no user ID,
   completion flag, percentage, or other state from the client.

2. Reuse the existing `auth` and `isStudent` middleware before route-parameter
   validation. Authentication therefore remains authoritative and an
   unauthenticated malformed path still receives 401. The existing session
   version, active/approved, account-deletion, and policy-acceptance gates remain
   in force.
3. Keep `Course.studentsEnroled` as the enrollment authority because it already
   gates v1 progress and protected playback and is updated by fulfillment and
   refund revocation. Do not combine inconsistent duplicated relationships into
   a new authorization rule in this slice.
4. Implement the bounded route → middleware → validated controller → service →
   repository → Mongoose → mapper/DTO architecture under
   `server/domains/learning`. Mount it before the Catalog V2 router's scoped
   catch-all.
5. Define strict request parameters and responses in
   `@studynotion/contracts`, register the public OpenAPI components, and validate
   every successful server response and frontend response before use. Errors
   retain the V2 request-ID envelope and `Cache-Control: private, no-store`.
6. Keep lesson-state retrieval and protected playback separate. Learning V2
   returns no `videoUrl`, signed URL, delivery type, Cloudinary public ID,
   learner identity, instructor administration data, or enrollment array. The
   active lesson continues to use the existing v1 protected playback endpoint,
   and its signed URL stays in component-local state rather than Redux or RTK
   Query cache.
7. Move only the course-learning state path to an isolated `learningApi` RTK
   Query service. It uses cookie credentials, a 15-second timeout, strict
   response parsing, and a 60-second unused-data lifetime. A successful
   completion replaces cached progress with the server result; the client does
   not optimistically calculate it. Logout and session invalidation clear the
   learning cache. The legacy `viewCourse` reducer remains registered for
   compatibility but no longer owns the player data path.

## Contract

The GET success data is deliberately small:

```json
{
  "course": {
    "id": "64b000000000000000000001",
    "name": "Production APIs",
    "thumbnailUrl": "https://cdn.example.test/course.webp"
  },
  "curriculum": [
    {
      "id": "64b000000000000000000002",
      "name": "Foundations",
      "lessons": [
        {
          "id": "64b000000000000000000003",
          "title": "Authorization",
          "description": "Authorize every resource.",
          "durationSeconds": 120
        }
      ]
    }
  ],
  "progress": {
    "courseId": "64b000000000000000000001",
    "completedLessonIds": [],
    "completedCount": 0,
    "totalLessons": 1,
    "progressPercent": 0,
    "updatedAt": null
  }
}
```

The normal success envelope also carries `success: true` and `requestId`. PUT
returns that same canonical progress object directly under `data`. Unknown
query/body keys and invalid path IDs fail before the service. Existing legacy
`progressUpdateRequestSchema` remains exported for compatibility but is not
wired to the mark-only endpoint.

## Progress authority and edge cases

The current Course → Section → extant SubSection graph defines the denominator.
The mapper restores source order after `$in` queries and keeps only the first
occurrence of each section and lesson. It intersects stored completion IDs with
those unique, extant current lesson IDs and emits completed IDs in curriculum
order.

Progress is:

```text
unique completed current lessons / unique extant current lessons × 100
```

It is rounded to two decimal places. Explicit behavior is:

- zero extant lessons: `0 / 0`, reported as 0%;
- removed, dangling, or foreign completion: retained in storage for
  compatibility but omitted from the DTO and percentage;
- duplicate legacy completion ID: counted once;
- duplicate section or lesson reference: first occurrence wins;
- archived or draft enrolled course: access remains based on enrollment, as in
  v1; there is no lesson-level published/archive field;
- curriculum changed after enrollment: the current structure immediately
  changes the denominator.

No course-version snapshot exists. Versioned curriculum/progress semantics are
deferred to a dedicated product and data-model decision.

## Idempotency and concurrency

The repository retains `$addToSet` with the existing compound unique index and
returns the post-update document. Repeating the same completion preserves one
stored lesson ID and the same counts/percentage. If two first completions race
to upsert the same user/course progress document, the unique-index loser retries
the idempotent update without an upsert. `updatedAt` may advance on a repeated
request; idempotency covers completion state, not byte-identical timestamps.

Authorization and the write are not a transaction. A refund or curriculum edit
racing between the check and update remains a pre-existing time-of-check/time-
of-use risk. Redesigning enrollment or adding cross-domain transactions is
outside this slice.

## Query and index impact

The happy-path GET performs one `_id`-bounded entitled Course read with a narrow
projection, one batched Section read, one batched SubSection read, and one exact
CourseProgress read. PUT performs the same curriculum authorization reads and
one atomic progress update. It does not deeply populate, perform N+1 lesson
queries, or load other learners' progress. A denied course uses one additional
`Course.exists` read to distinguish missing from non-enrolled.

No new index is justified. MongoDB's `_id` indexes serve Course, Section, and
SubSection lookups; the existing unique `userId_1_courseID_1` index serves
progress. The guarded MongoDB 8 integration test verifies its IXSCAN and a
maximum of one examined progress document. These small-fixture results are
correctness/query-shape evidence, not a production-cardinality benchmark.

## Player and accessibility

The player keeps its existing nested URL and review action while using a calmer
two-column layout. It provides an ordered section hierarchy, current and
completed lesson text, an exact count and percentage, a native progress element,
persistent previous/next links that skip empty sections, secure-media loading
and retry states, a post-video completion action, and explicit empty, denied,
invalid-route, and recoverable error states.

Section disclosure uses semantic buttons with `aria-expanded` and
`aria-controls`; lesson navigation uses links and `aria-current`; completion is
communicated in text as well as color; loading and mutation messages use status
or alert semantics. The mobile course-content dialog moves focus inside, traps
Tab, closes with Escape, and restores trigger focus. Caption metadata does not
exist in the current lesson model, so captions remain explicit accessibility
debt rather than fabricated tracks.

## Compatibility and deferred data work

- No model field, collection, v1 route, or protected-media rule is removed.
- No migration, backfill, or index build is required.
- Authentication, OTP, Google identity, payment, webhook, reconciliation,
  refund, account deletion, CSRF/origin, rate limiting, and production preflight
  code remain outside the slice.
- `User.courses`, `Course.studentsEnroled`, `Purchase.activeCourses`, and
  CourseProgress remain duplicated and can diverge. A future enrollment-model
  phase must define migration, reconciliation, and transaction/compensation
  behavior before changing that authority.
- Course and section arrays can grow within MongoDB document limits. Production-
  shaped latency and array cardinality still need monitoring before changing
  response bounds.

## Rollout and rollback

Deploy the contracts/API and web assets from one reviewed immutable release.
Before broad rollout, run the full repository suite and guarded MongoDB 8/Redis
7.4 integration, then canary while monitoring Learning V2 401/403/404/500 rates,
slow-lookups keyed by request ID, progress duplicate-key retries, protected
playback failures, and client contract failures. Do not log cookies, JWTs,
signed media URLs, learner IDs, or provider metadata.

Rollback by routing to the prior immutable release or reviewing and reverting
the Learning V2 commits in reverse order. Never reset or force-push shared
history. The old v1 player endpoints remain available, and no database rollback,
index removal, or data restore is required because this slice only adds routes
and uses the existing CourseProgress representation. Restore a database backup
only for an independent data incident.
