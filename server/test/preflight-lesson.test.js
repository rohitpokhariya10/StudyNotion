const assert = require("node:assert/strict")
const test = require("node:test")

const {
  isPublishedLessonMetadataValid,
  parsePreflightSidecarStartedAt,
} = require("../scripts/preflight-production")

const validLesson = {
  description: "A complete lesson",
  timeDuration: "180",
  title: "Introduction",
  videoDeliveryType: "authenticated",
  videoFormat: "mp4",
  videoPublicId: "courses/introduction",
  videoUrl: "https://cdn.example.test/private-video.mp4",
}

test("production preflight validates published lesson metadata and duration", () => {
  assert.equal(isPublishedLessonMetadataValid(validLesson), true)
  assert.equal(
    isPublishedLessonMetadataValid({ ...validLesson, timeDuration: "NaN" }),
    false
  )
  assert.equal(
    isPublishedLessonMetadataValid({ ...validLesson, timeDuration: "0" }),
    false
  )
  assert.equal(
    isPublishedLessonMetadataValid({ ...validLesson, title: " " }),
    false
  )
  assert.equal(
    isPublishedLessonMetadataValid({
      ...validLesson,
      videoUrl: "http://cdn.example.test/public-video.mp4",
    }),
    false
  )
})

test("production preflight rejects a materially future Entitlement boundary", () => {
  const now = new Date("2026-08-21T10:00:00.000Z")
  assert.equal(
    parsePreflightSidecarStartedAt(
      "2026-08-21T10:05:00.000Z",
      now
    ).toISOString(),
    "2026-08-21T10:05:00.000Z"
  )
  assert.throws(
    () => parsePreflightSidecarStartedAt("2099-01-01T00:00:00.000Z", now),
    /cannot be more than 5 minutes in the future/
  )
})
