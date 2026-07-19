const assert = require("node:assert/strict")
const test = require("node:test")

const Course = require("../models/Course")
const Section = require("../models/Section")
const SubSection = require("../models/Subsection")

test("course and lesson schemas enforce bounded production inputs", async () => {
  const course = new Course({
    instructor: "64b000000000000000000001",
    price: -1,
    tag: ["security"],
  })
  await assert.rejects(course.validate(), /less than minimum allowed value/)

  const section = new Section({ sectionName: "s".repeat(201) })
  await assert.rejects(section.validate(), /longer than the maximum allowed length/)

  const subSection = new SubSection({ description: "d".repeat(5001) })
  await assert.rejects(
    subSection.validate(),
    /longer than the maximum allowed length/
  )
})

test("course, section, and lesson schemas maintain timestamps", () => {
  assert.equal(Course.schema.options.timestamps, true)
  assert.equal(Section.schema.options.timestamps, true)
  assert.equal(SubSection.schema.options.timestamps, true)
})
