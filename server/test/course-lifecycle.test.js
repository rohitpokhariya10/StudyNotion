const assert = require("node:assert/strict")
const test = require("node:test")

let sections = []
let subsections = []

const lesson = (id) => ({
  _id: id,
  description: "Complete lesson",
  timeDuration: "120",
  title: "Lesson title",
  videoDeliveryType: "authenticated",
  videoFormat: "mp4",
  videoPublicId: `courses/${id}`,
  videoUrl: "https://cdn.example.test/lesson.mp4",
})

const installMock = (modulePath, exports) => {
  const filename = require.resolve(modulePath)
  require.cache[filename] = { id: filename, filename, loaded: true, exports }
}

installMock("../models/Course", {})
installMock("../models/Section", {
  find: () => ({
    select: () => ({ lean: async () => sections }),
  }),
})
installMock("../models/Subsection", {
  find: () => ({
    select: () => ({ lean: async () => subsections }),
  }),
})

delete require.cache[require.resolve("../utils/courseLifecycle")]
const { isCoursePublishReady } = require("../utils/courseLifecycle")

test("a course without sections cannot be published", async () => {
  assert.equal(await isCoursePublishReady([]), false)
})

test("publish readiness rejects dangling sections and empty sections", async () => {
  sections = [{ _id: "section-1", subSection: ["lesson-1"] }]
  subsections = [lesson("lesson-1")]
  assert.equal(
    await isCoursePublishReady(["section-1", "missing-section"]),
    false
  )

  sections = [{ _id: "section-1", subSection: [] }]
  subsections = []
  assert.equal(await isCoursePublishReady(["section-1"]), false)
})

test("every referenced section and lesson must exist before publishing", async () => {
  sections = [
    { _id: "section-1", subSection: ["lesson-1"] },
    { _id: "section-2", subSection: ["lesson-2"] },
  ]
  subsections = [lesson("lesson-1"), lesson("lesson-2")]
  assert.equal(
    await isCoursePublishReady(["section-1", "section-2"]),
    true
  )

  subsections = [lesson("lesson-1")]
  assert.equal(
    await isCoursePublishReady(["section-1", "section-2"]),
    false
  )
})

test("publish readiness rejects insecure or invalid lesson metadata", async () => {
  sections = [{ _id: "section-1", subSection: ["lesson-1"] }]
  subsections = [lesson("lesson-1")]
  assert.equal(await isCoursePublishReady(["section-1"]), true)

  subsections = [{ ...lesson("lesson-1"), timeDuration: "0" }]
  assert.equal(await isCoursePublishReady(["section-1"]), false)

  subsections = [{ ...lesson("lesson-1"), videoDeliveryType: "upload" }]
  assert.equal(await isCoursePublishReady(["section-1"]), false)
})
