const NeetMockTest = require("../models/NeetMockTest")
const NeetQuestion = require("../models/NeetQuestion")
const { buildSampleQuestionBank } = require("./sampleQuestionBank")
const { SAMPLE_MOCKS, instructionsFor } = require("./sampleMocks")

const KEYS = ["A", "B", "C", "D"]

const questionDocument = ({ item, order, sectionKey, testId }) => ({
  testId,
  sectionKey,
  order,
  text: item.text,
  options: item.options.map((text, index) => ({ key: KEYS[index], text })),
  media: item.media || [],
  answerKey: { correctOptionKeys: [item.correct] },
  explanation: "",
  topic: item.topic,
  status: "ACTIVE",
  isSample: true,
})

const contentSignature = (document) =>
  JSON.stringify({
    text: document.text,
    options: document.options,
    media: document.media,
    answerKey: document.answerKey?.correctOptionKeys || [],
  })

// Idempotent, additive upsert of the sample mocks. Existing tests keep their
// IDs; a changed question gets a new revision so attempt snapshots can tell
// which revision they were scored against. Nothing is deleted.
const seedSampleMocks = async ({ now = new Date(), write = () => {} } = {}) => {
  const bank = buildSampleQuestionBank()
  const summary = []

  for (const mock of SAMPLE_MOCKS) {
    const testFields = {
      title: mock.title,
      tagline: mock.tagline,
      description: mock.description,
      instructions: instructionsFor(mock),
      difficulty: mock.difficulty,
      isSample: true,
      patternNote: mock.patternNote,
      durationSeconds: mock.durationSeconds,
      marking: { correct: 4, incorrect: -1, unanswered: 0 },
      sections: mock.sections.map(
        ({ bankStart: _bankStart, ...section }) => section
      ),
      modes: mock.modes,
      proctorPolicy: mock.proctorPolicy,
      displayOrder: mock.displayOrder,
    }
    const test = await NeetMockTest.findOneAndUpdate(
      { slug: mock.slug },
      {
        $set: testFields,
        $setOnInsert: {
          slug: mock.slug,
          status: "PUBLISHED",
          publishedAt: now,
          version: 1,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    )

    let created = 0
    let revised = 0
    for (const section of mock.sections) {
      const items = bank[section.subjectKey].slice(
        section.bankStart,
        section.bankStart + section.questionCount
      )
      if (items.length < section.questionCount) {
        throw new Error(
          `The sample bank is too small for ${mock.slug}/${section.key}`
        )
      }
      for (const [index, item] of items.entries()) {
        const document = questionDocument({
          item,
          order: index + 1,
          sectionKey: section.key,
          testId: test._id,
        })
        const existing = await NeetQuestion.findOne({
          testId: test._id,
          sectionKey: section.key,
          order: index + 1,
        }).select("+answerKey text options media revision")
        if (!existing) {
          await NeetQuestion.create(document)
          created += 1
          continue
        }
        const before = contentSignature(existing.toObject({ transform: false }))
        if (before !== contentSignature(document)) {
          await NeetQuestion.updateOne(
            { _id: existing._id },
            {
              $set: {
                text: document.text,
                options: document.options,
                media: document.media,
                answerKey: document.answerKey,
                topic: document.topic,
                status: "ACTIVE",
              },
              $inc: { revision: 1 },
            },
            { runValidators: true }
          )
          revised += 1
        }
      }
    }
    summary.push({ slug: mock.slug, created, revised })
    write(
      `Project NEET sample mock ready: ${mock.slug} (${created} created, ${revised} revised)`
    )
  }
  return summary
}

module.exports = { seedSampleMocks }
