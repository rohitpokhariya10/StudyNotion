const VALID_LEVELS = new Set(["beginner", "intermediate", "advanced"])
const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/

const positiveInteger = (value) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0
}

const mapInstructor = (instructor) => {
  const id = instructor?._id?.toString()
  const name = [instructor?.firstName, instructor?.lastName]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim())
    .join(" ")
  if (!id || !name) return null
  return {
    id,
    name,
    imageUrl:
      typeof instructor.image === "string" && instructor.image.trim()
        ? instructor.image.trim()
        : null,
  }
}

const mapCategory = (category) => {
  const id = category?._id?.toString()
  const name = typeof category?.name === "string" ? category.name.trim() : ""
  return id && name ? { id, name } : null
}

const mapCatalogCourse = (document) => {
  const average = Number(document.ratingAverage)
  const language =
    typeof document.language === "string"
      ? document.language.trim().toLowerCase()
      : ""

  return {
    id: document._id.toString(),
    name: document.courseName,
    description: document.courseDescription,
    thumbnailUrl: document.thumbnail,
    price: Number(document.price),
    currency: "INR",
    instructor: mapInstructor(document.instructor),
    category: mapCategory(document.category),
    rating: {
      average:
        Number.isFinite(average) && average > 0
          ? Math.round(Math.min(average, 5) * 10) / 10
          : 0,
      count: positiveInteger(document.ratingCount),
    },
    durationSeconds: positiveInteger(document.durationSeconds),
    level: VALID_LEVELS.has(document.level) ? document.level : null,
    language: LANGUAGE_PATTERN.test(language) ? language : null,
    enrollmentCount: positiveInteger(document.enrollmentCount),
    createdAt: new Date(document.createdAt).toISOString(),
  }
}

module.exports = { mapCatalogCourse }
