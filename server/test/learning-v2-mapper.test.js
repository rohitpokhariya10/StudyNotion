const assert = require("node:assert/strict")
const test = require("node:test")

const {
  mapLearningCourseState,
  mapLearningCurriculum,
} = require("../domains/learning/learningMapper")

const ids = {
  course: "64b000000000000000000001",
  sectionOne: "64b000000000000000000002",
  sectionTwo: "64b000000000000000000003",
  missingSection: "64b000000000000000000004",
  lessonOne: "64b000000000000000000005",
  lessonTwo: "64b000000000000000000006",
  lessonThree: "64b000000000000000000007",
  danglingLesson: "64b000000000000000000008",
}

test("learning mapper preserves source order while removing duplicate and dangling relations", () => {
  const course = {
    _id: ids.course.toUpperCase(),
    courseName: "  Reliable APIs  ",
    thumbnail: "data:image/svg+xml,course",
    courseContent: [
      ids.sectionTwo,
      ids.missingSection,
      ids.sectionOne,
      ids.sectionTwo,
    ],
  }
  const curriculum = mapLearningCurriculum({
    course,
    sections: [
      {
        _id: ids.sectionOne,
        sectionName: "Second",
        subSection: [
          ids.lessonTwo,
          ids.danglingLesson,
          ids.lessonOne,
          ids.lessonTwo,
        ],
      },
      {
        _id: ids.sectionTwo,
        sectionName: "First",
        subSection: [ids.lessonOne, ids.lessonThree],
      },
    ],
    lessons: [
      {
        _id: ids.lessonThree,
        title: "No duration",
        description: "  A legacy duration.  ",
        timeDuration: "-20",
        videoPublicId: "must-not-map",
        videoUrl: "https://private.example.test/video.mp4",
      },
      {
        _id: ids.lessonTwo,
        title: "Later",
        description: "Later lesson",
        timeDuration: "999999999",
      },
      {
        _id: ids.lessonOne,
        title: "Start",
        description: "Start here",
        timeDuration: "59.6",
      },
    ],
  })

  assert.deepEqual(
    curriculum.map((section) => section.id),
    [ids.sectionTwo, ids.sectionOne]
  )
  assert.deepEqual(
    curriculum.flatMap((section) => section.lessons.map((lesson) => lesson.id)),
    [ids.lessonOne, ids.lessonThree, ids.lessonTwo]
  )
  assert.deepEqual(
    curriculum.flatMap((section) =>
      section.lessons.map((lesson) => lesson.durationSeconds)
    ),
    [60, 0, 31_536_000]
  )
  assert.equal(curriculum[0].lessons[1].description, "A legacy duration.")
  assert.equal(JSON.stringify(curriculum).includes("must-not-map"), false)
  assert.equal(JSON.stringify(curriculum).includes("private.example"), false)

  const state = mapLearningCourseState({
    course,
    curriculum,
    progress: {
      completedVideos: [
        ids.lessonTwo,
        ids.lessonTwo,
        ids.danglingLesson,
        ids.lessonThree,
      ],
      updatedAt: new Date("2026-08-08T08:00:00.000Z"),
    },
  })

  assert.deepEqual(state.course, {
    id: ids.course,
    name: "Reliable APIs",
    thumbnailUrl: "data:image/svg+xml,course",
  })
  assert.deepEqual(state.progress, {
    courseId: ids.course,
    completedLessonIds: [ids.lessonThree, ids.lessonTwo],
    completedCount: 2,
    totalLessons: 3,
    progressPercent: 66.67,
    updatedAt: "2026-08-08T08:00:00.000Z",
  })
})

test("learning mapper gives legacy labels and deterministic zero-lesson progress", () => {
  const course = {
    _id: ids.course,
    courseName: " ",
    thumbnail: "",
    courseContent: [ids.sectionOne],
  }
  const curriculum = mapLearningCurriculum({
    course,
    sections: [
      {
        _id: ids.sectionOne,
        sectionName: "",
        subSection: [ids.danglingLesson],
      },
    ],
    lessons: [],
  })
  const state = mapLearningCourseState({
    course,
    curriculum,
    progress: {
      completedVideos: [ids.danglingLesson, ids.danglingLesson],
      updatedAt: "not-a-date",
    },
  })

  assert.equal(state.course.name, "Untitled course")
  assert.equal(state.course.thumbnailUrl, null)
  assert.deepEqual(state.curriculum, [
    { id: ids.sectionOne, name: "Untitled section", lessons: [] },
  ])
  assert.deepEqual(state.progress, {
    courseId: ids.course,
    completedLessonIds: [],
    completedCount: 0,
    totalLessons: 0,
    progressPercent: 0,
    updatedAt: null,
  })
})

test("learning mapper supplies a usable title for a legacy unnamed extant lesson", () => {
  const course = {
    _id: ids.course,
    courseName: "Course",
    thumbnail: null,
    courseContent: [ids.sectionOne],
  }
  const curriculum = mapLearningCurriculum({
    course,
    sections: [
      {
        _id: ids.sectionOne,
        sectionName: "Section",
        subSection: [ids.lessonOne],
      },
    ],
    lessons: [
      {
        _id: ids.lessonOne,
        title: "",
        description: undefined,
        timeDuration: null,
      },
    ],
  })

  assert.deepEqual(curriculum[0].lessons[0], {
    id: ids.lessonOne,
    title: "Untitled lesson",
    description: "",
    durationSeconds: 0,
  })
})
