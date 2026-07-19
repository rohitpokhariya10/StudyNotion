const asPlainObject = (document) =>
  typeof document?.toObject === "function" ? document.toObject() : { ...document }

const sanitizeInstructorCourse = (document) => {
  const course = asPlainObject(document)
  course.totalStudentsEnrolled = Array.isArray(course.studentsEnroled)
    ? course.studentsEnroled.length
    : 0
  delete course.studentsEnroled
  delete course.archivedBy
  delete course.thumbnailPublicId
  delete course.__v

  if (course.category && typeof course.category === "object") {
    course.category = {
      _id: course.category._id,
      description: course.category.description,
      name: course.category.name,
    }
  }
  if (Array.isArray(course.ratingAndReviews)) {
    course.ratingAndReviews = course.ratingAndReviews.map((review) => ({
      _id: review._id,
      createdAt: review.createdAt,
      rating: review.rating,
      review: review.review,
    }))
  }
  return course
}

module.exports = { sanitizeInstructorCourse }
