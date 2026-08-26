import { getLessonPlaybackUrl } from "@/entities/course"
import {
  getLearningErrorPresentation,
  useMarkLessonCompleteMutation,
} from "@/entities/learning"
import { useEffect, useRef, useState } from "react"
import { Link, useOutletContext, useParams } from "react-router"

const lessonPath = (courseId, item) =>
  `/view-course/${encodeURIComponent(courseId)}/section/${encodeURIComponent(
    item.sectionId
  )}/sub-section/${encodeURIComponent(item.lesson.id)}`

const lessonDuration = (seconds) => {
  if (!seconds) return null
  const minutes = Math.max(1, Math.round(seconds / 60))
  return `${minutes} min`
}

const VideoDetails = () => {
  const { courseId, sectionId, subSectionId } = useParams()
  const { learningCourse } = useOutletContext()
  const playerRef = useRef(null)
  const retriedLessonRef = useRef(null)
  const resumeAtRef = useRef(0)
  const [endedVideoId, setEndedVideoId] = useState(null)
  const [playback, setPlayback] = useState(null)
  const [playbackError, setPlaybackError] = useState("")
  const [playbackLoading, setPlaybackLoading] = useState(false)
  const [playbackRefresh, setPlaybackRefresh] = useState(0)
  const [completionNotice, setCompletionNotice] = useState({
    lessonId: null,
    message: "",
  })
  const [markLessonComplete, completion] = useMarkLessonCompleteMutation()

  const lessonItems = learningCourse.curriculum.flatMap((section) =>
    section.lessons.map((lesson) => ({ sectionId: section.id, lesson }))
  )
  const currentLessonIndex = lessonItems.findIndex(
    (item) => item.sectionId === sectionId && item.lesson.id === subSectionId
  )
  const currentItem = lessonItems[currentLessonIndex]
  const lesson = currentItem?.lesson
  const previousItem =
    currentLessonIndex > 0 ? lessonItems[currentLessonIndex - 1] : null
  const nextItem =
    currentLessonIndex >= 0 && currentLessonIndex < lessonItems.length - 1
      ? lessonItems[currentLessonIndex + 1]
      : null
  const completed =
    learningCourse.progress.completedLessonIds.includes(subSectionId)
  const videoEnded = endedVideoId === subSectionId

  useEffect(() => {
    retriedLessonRef.current = null
    resumeAtRef.current = 0
  }, [courseId, subSectionId])

  useEffect(() => {
    if (!courseId || !subSectionId || !lesson) return undefined

    let active = true

    const loadPlayback = async () => {
      setEndedVideoId(null)
      setPlaybackLoading(true)
      setPlaybackError("")

      try {
        const freshPlayback = await getLessonPlaybackUrl(courseId, subSectionId)
        if (active) setPlayback({ ...freshPlayback, subSectionId })
      } catch (error) {
        if (active) {
          setPlayback(null)
          setPlaybackError(error.message)
        }
      } finally {
        if (active) setPlaybackLoading(false)
      }
    }

    void loadPlayback()

    return () => {
      active = false
    }
  }, [courseId, lesson, playbackRefresh, subSectionId])

  const refreshPlayback = ({ automatic = false } = {}) => {
    const lessonKey = `${courseId}:${subSectionId}`
    if (automatic && retriedLessonRef.current === lessonKey) {
      setPlaybackError(
        "The secure video session could not be renewed. Please try again."
      )
      return
    }

    if (automatic) retriedLessonRef.current = lessonKey
    else retriedLessonRef.current = null
    resumeAtRef.current = playerRef.current?.currentTime || 0
    setPlayback(null)
    setPlaybackError("")
    setPlaybackRefresh((value) => value + 1)
  }

  const restorePlaybackPosition = () => {
    if (!playerRef.current || resumeAtRef.current <= 0) return
    playerRef.current.currentTime = resumeAtRef.current
    resumeAtRef.current = 0
    playerRef.current.play().catch(() => undefined)
  }

  const handleLessonCompletion = async () => {
    if (completed || completion.isLoading) return
    setCompletionNotice({ lessonId: subSectionId, message: "" })

    try {
      await markLessonComplete({ courseId, lessonId: subSectionId }).unwrap()
      setCompletionNotice({
        lessonId: subSectionId,
        message: "Lesson marked complete.",
      })
    } catch (error) {
      const presentation = getLearningErrorPresentation(error, {
        fallbackMessage:
          "We could not save your progress. Your video remains available.",
      })
      setCompletionNotice({
        lessonId: subSectionId,
        message: `${presentation.message}${
          presentation.requestId ? ` Reference: ${presentation.requestId}` : ""
        }`,
      })
    }
  }

  if (!lesson) {
    return (
      <section className="grid min-h-[60vh] place-items-center text-center text-richblack-5">
        <div className="max-w-md" role="alert">
          <p className="text-sm font-semibold tracking-wide text-yellow-50 uppercase">
            Lesson not found
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            This lesson is not part of the current course.
          </h1>
          <p className="mt-3 text-richblack-200">
            Choose an available lesson from the course content panel.
          </p>
        </div>
      </section>
    )
  }

  const activePlayback =
    String(playback?.subSectionId || "") === String(subSectionId || "")
      ? playback
      : null
  const duration = lessonDuration(lesson.durationSeconds)
  const completionMessage =
    completionNotice.lessonId === subSectionId ? completionNotice.message : ""

  return (
    <article className="text-richblack-5">
      <header className="mb-5">
        <p className="text-sm font-medium text-richblack-300">
          {completed ? "Completed" : "In progress"}
          {duration ? ` · ${duration}` : ""}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {lesson.title}
        </h1>
      </header>

      <section aria-label="Secure lesson video">
        {playbackLoading || (!playbackError && !activePlayback) ? (
          <div
            className="grid aspect-video place-items-center rounded-md border border-richblack-700 bg-black"
            aria-busy="true"
          >
            <div role="status" aria-label="Loading lesson video">
              <div className="spinner" aria-hidden="true" />
            </div>
          </div>
        ) : playbackError || !activePlayback?.url ? (
          <div className="grid aspect-video place-items-center rounded-md border border-richblack-700 bg-black px-6 text-center">
            <div className="max-w-md">
              <h2 className="text-lg font-semibold text-richblack-25">
                This lesson video could not be loaded.
              </h2>
              {playbackError && (
                <p className="mt-2 text-sm text-richblack-300" role="alert">
                  {playbackError}
                </p>
              )}
              <button
                type="button"
                className="yellowButton mt-4 min-h-11"
                onClick={() => refreshPlayback()}
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <div className="relative aspect-video overflow-hidden rounded-md border border-richblack-700 bg-black">
            <video
              key={`${lesson.id}:${activePlayback.url}`}
              ref={playerRef}
              className="h-full w-full"
              controls
              playsInline
              preload="metadata"
              poster={learningCourse.course.thumbnailUrl || undefined}
              onEnded={() => setEndedVideoId(subSectionId)}
              onPlay={() => setEndedVideoId(null)}
              onLoadedMetadata={restorePlaybackPosition}
              onError={() => refreshPlayback({ automatic: true })}
              src={activePlayback.url}
            >
              Your browser does not support HTML5 video.
            </video>

            {videoEnded && (
              <div className="absolute inset-0 z-10 grid place-content-center bg-black/85 px-5 text-center">
                <p className="font-medium text-richblack-25">
                  You’ve reached the end of this lesson.
                </p>
                {!completed && (
                  <button
                    type="button"
                    disabled={completion.isLoading}
                    onClick={handleLessonCompletion}
                    className="yellowButton mx-auto mt-4 min-h-11 disabled:cursor-wait disabled:opacity-60"
                  >
                    {completion.isLoading
                      ? "Saving progress…"
                      : "Mark lesson complete"}
                  </button>
                )}
                {completed && (
                  <p className="mt-3 font-semibold text-caribbeangreen-100">
                    Completed
                  </p>
                )}
                <button
                  type="button"
                  disabled={completion.isLoading}
                  onClick={() => {
                    if (!playerRef.current) return
                    playerRef.current.currentTime = 0
                    playerRef.current.play().catch(() => undefined)
                    setEndedVideoId(null)
                  }}
                  className="mx-auto mt-3 min-h-11 rounded-md border border-richblack-500 px-5 py-2 font-semibold text-richblack-5 hover:border-richblack-300"
                >
                  Rewatch
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="mt-5 flex flex-col gap-4 border-b border-richblack-700 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-richblack-50">
            {completed ? "Lesson completed" : "Lesson not completed"}
          </p>
          {!completed && !videoEnded && (
            <p className="mt-1 text-sm text-richblack-300">
              Finish the video to mark this lesson complete.
            </p>
          )}
          <p
            className="mt-1 text-sm text-richblack-200"
            aria-live="polite"
            role={completion.isError ? "alert" : "status"}
          >
            {completionMessage}
          </p>
        </div>

        <nav className="flex flex-wrap gap-3" aria-label="Lesson navigation">
          {previousItem && (
            <Link
              className="flex min-h-11 items-center rounded-md border border-richblack-600 px-4 py-2 text-sm font-semibold text-richblack-50 hover:border-richblack-400"
              to={lessonPath(learningCourse.course.id, previousItem)}
            >
              Previous lesson
            </Link>
          )}
          {nextItem && (
            <Link
              className="flex min-h-11 items-center rounded-md bg-yellow-50 px-4 py-2 text-sm font-semibold text-richblack-900 hover:bg-yellow-100"
              to={lessonPath(learningCourse.course.id, nextItem)}
            >
              Next lesson
            </Link>
          )}
        </nav>
      </div>

      {lesson.description && (
        <section className="py-6" aria-labelledby="lesson-about-heading">
          <h2 id="lesson-about-heading" className="text-lg font-semibold">
            About this lesson
          </h2>
          <p className="mt-2 max-w-3xl leading-7 whitespace-pre-wrap text-richblack-200">
            {lesson.description}
          </p>
        </section>
      )}
    </article>
  )
}

export default VideoDetails
