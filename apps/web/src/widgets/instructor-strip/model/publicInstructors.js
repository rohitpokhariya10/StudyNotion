import { useGetCoursesInfiniteQuery } from "@/entities/catalog"
import { useEffect, useMemo } from "react"

// Newest published courses across every subject. A stable argument keeps one
// shared cache entry for every caller (strip and Services facts).
const PUBLIC_COURSES = Object.freeze({})
// Up to three catalog pages (36 courses) are read for public profiles.
const MAX_PAGES = 3

// Unique instructors in first-seen order (newest courses first). Each keeps
// one of their courses to link to and that course's subject.
export function instructorsFromCourses(pages = []) {
  const seen = new Map()
  for (const page of pages)
    for (const course of page?.items || []) {
      const instructor = course.instructor
      if (!instructor?.id || seen.has(instructor.id)) continue
      seen.set(instructor.id, {
        id: instructor.id,
        name: instructor.name,
        imageUrl: instructor.imageUrl || "",
        subject: course.category?.name || null,
        courseId: course.id,
        courseName: course.name,
      })
    }
  return [...seen.values()]
}

export function usePublicInstructors() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useGetCoursesInfiniteQuery(PUBLIC_COURSES)
  const pages = useMemo(() => data?.pages || [], [data])

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && pages.length < MAX_PAGES)
      fetchNextPage()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, pages.length])

  return {
    instructors: useMemo(() => instructorsFromCourses(pages), [pages]),
    // True only when every published course has been read, so a count of
    // instructors is a platform-wide total rather than a partial list.
    complete: pages.length > 0 && !hasNextPage,
    isError,
    isLoading,
    refetch,
  }
}
