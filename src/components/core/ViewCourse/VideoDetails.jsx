import { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-dom"

import {
  getLessonPlaybackUrl,
  markLectureAsComplete,
} from "../../../services/operations/courseDetailsAPI"
import { updateCompletedLectures } from "../../../slices/viewCourseSlice"
import IconBtn from "../../Common/IconBtn"

const VideoDetails = () => {
  const { courseId, sectionId, subSectionId } = useParams()
  const navigate = useNavigate()
  const playerRef = useRef(null)
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { courseSectionData, courseEntireData, completedLectures } =
    useSelector((state) => state.viewCourse)

  const [endedVideoId, setEndedVideoId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [playback, setPlayback] = useState(null)
  const [playbackError, setPlaybackError] = useState("")
  const [playbackLoading, setPlaybackLoading] = useState(false)
  const [playbackRefresh, setPlaybackRefresh] = useState(0)
  const retriedLessonRef = useRef(null)
  const resumeAtRef = useRef(0)

  const currentSectionIndex = courseSectionData.findIndex(
    (section) => section?._id === sectionId
  )
  const currentSection = courseSectionData[currentSectionIndex]
  const currentSubSectionIndex = currentSection?.subSection?.findIndex(
    (subSection) => subSection?._id === subSectionId
  )
  const videoData =
    currentSubSectionIndex >= 0
      ? currentSection?.subSection?.[currentSubSectionIndex]
      : null
  const videoEnded = endedVideoId === subSectionId

  useEffect(() => {
    retriedLessonRef.current = null
    resumeAtRef.current = 0
  }, [courseId, subSectionId])

  useEffect(() => {
    if (!courseId || !subSectionId || !videoData) return undefined

    let active = true

    const loadPlayback = async () => {
      setPlaybackLoading(true)
      setPlaybackError("")

      try {
        const freshPlayback = await getLessonPlaybackUrl(
          courseId,
          subSectionId
        )
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
  }, [courseId, playbackRefresh, subSectionId, videoData])

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

  const handlePlaybackError = () => refreshPlayback({ automatic: true })

  const restorePlaybackPosition = () => {
    if (!playerRef.current || resumeAtRef.current <= 0) return
    playerRef.current.currentTime = resumeAtRef.current
    resumeAtRef.current = 0
    playerRef.current.play().catch(() => undefined)
  }

  // check if the lecture is the first video of the course
  const isFirstVideo =
    currentSectionIndex === 0 && currentSubSectionIndex === 0

  // go to the next video
  const goToNextVideo = () => {
    // console.log(courseSectionData)

    if (!currentSection || currentSubSectionIndex < 0) return

    if (currentSubSectionIndex < currentSection.subSection.length - 1) {
      const nextSubSectionId = currentSection.subSection[
        currentSubSectionIndex + 1
      ]?._id
      if (!nextSubSectionId) return
      navigate(
        `/view-course/${courseId}/section/${sectionId}/sub-section/${nextSubSectionId}`
      )
    } else {
      const nextSection = courseSectionData[currentSectionIndex + 1]
      const nextSectionId = nextSection?._id
      const nextSubSectionId = nextSection?.subSection?.[0]?._id
      if (!nextSectionId || !nextSubSectionId) return
      navigate(
        `/view-course/${courseId}/section/${nextSectionId}/sub-section/${nextSubSectionId}`
      )
    }
  }

  // check if the lecture is the last video of the course
  const isLastVideo =
    currentSectionIndex === courseSectionData.length - 1 &&
    currentSubSectionIndex === (currentSection?.subSection?.length || 0) - 1

  // go to the previous video
  const goToPrevVideo = () => {
    // console.log(courseSectionData)

    if (!currentSection || currentSubSectionIndex < 0) return

    if (currentSubSectionIndex > 0) {
      const prevSubSectionId = currentSection.subSection[
        currentSubSectionIndex - 1
      ]?._id
      if (!prevSubSectionId) return
      navigate(
        `/view-course/${courseId}/section/${sectionId}/sub-section/${prevSubSectionId}`
      )
    } else {
      const previousSection = courseSectionData[currentSectionIndex - 1]
      const previousSubSections = previousSection?.subSection || []
      const prevSectionId = previousSection?._id
      const prevSubSectionId = previousSubSections.at(-1)?._id
      if (!prevSectionId || !prevSubSectionId) return
      navigate(
        `/view-course/${courseId}/section/${prevSectionId}/sub-section/${prevSubSectionId}`
      )
    }
  }

  const handleLectureCompletion = async () => {
    setLoading(true)
    try {
      const completed = await markLectureAsComplete(
        { courseId, subsectionId: subSectionId },
        token
      )
      if (completed && !completedLectures.includes(subSectionId)) {
        dispatch(updateCompletedLectures(subSectionId))
      }
    } finally {
      setLoading(false)
    }
  }

  const activePlayback =
    String(playback?.subSectionId || "") === String(subSectionId || "")
      ? playback
      : null

  return (
    <div className="flex flex-col gap-5 text-white">
      {!videoData ? (
        <img
          src={courseEntireData?.thumbnail}
          alt="Preview"
          className="h-full w-full rounded-md object-cover"
        />
      ) : playbackLoading || (!playbackError && !activePlayback) ? (
        <div className="grid aspect-video place-items-center rounded-md bg-black">
          <div
            className="spinner"
            role="status"
            aria-label="Loading lesson video"
          />
        </div>
      ) : playbackError || !activePlayback?.url ? (
        <div className="grid aspect-video place-items-center rounded-md bg-black px-6 text-center">
          <div>
            <p className="text-lg font-semibold text-richblack-25">
              This lesson video could not be loaded.
            </p>
            {playbackError && (
              <p className="mt-2 text-sm text-richblack-300" role="alert">
                {playbackError}
              </p>
            )}
            <button
              type="button"
              className="yellowButton mt-4"
              onClick={() => refreshPlayback()}
            >
              Try again
            </button>
          </div>
        </div>
      ) : (
        <div className="relative aspect-video overflow-hidden rounded-md bg-black">
          <video
            key={`${videoData._id}:${activePlayback.url}`}
            ref={playerRef}
            className="h-full w-full"
            controls
            playsInline
            preload="metadata"
            poster={courseEntireData?.thumbnail}
            onEnded={() => setEndedVideoId(subSectionId)}
            onPlay={() => setEndedVideoId(null)}
            onLoadedMetadata={restorePlaybackPosition}
            onError={handlePlaybackError}
            src={activePlayback.url}
          >
            Your browser does not support HTML5 video.
          </video>
          {/* Render When Video Ends */}
          {videoEnded && (
            <div
              style={{
                backgroundImage:
                  "linear-gradient(to top, rgb(0, 0, 0), rgba(0,0,0,0.7), rgba(0,0,0,0.5), rgba(0,0,0,0.1)",
              }}
              className="full absolute inset-0 z-[100] grid h-full place-content-center font-inter"
            >
              {!completedLectures.includes(subSectionId) && (
                <IconBtn
                  disabled={loading}
                  onclick={() => handleLectureCompletion()}
                  text={!loading ? "Mark As Completed" : "Loading..."}
                  customClasses="text-xl max-w-max px-4 mx-auto"
                />
              )}
              <IconBtn
                disabled={loading}
                onclick={() => {
                  if (playerRef?.current) {
                    playerRef.current.currentTime = 0
                    playerRef.current.play().catch(() => undefined)
                    setEndedVideoId(null)
                  }
                }}
                text="Rewatch"
                customClasses="text-xl max-w-max px-4 mx-auto mt-2"
              />
              <div className="mt-10 flex min-w-[250px] justify-center gap-x-4 text-xl">
                {!isFirstVideo && (
                  <button
                    disabled={loading}
                    onClick={goToPrevVideo}
                    className="blackButton"
                  >
                    Prev
                  </button>
                )}
                {!isLastVideo && (
                  <button
                    disabled={loading}
                    onClick={goToNextVideo}
                    className="blackButton"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <h1 className="mt-4 text-3xl font-semibold">{videoData?.title}</h1>
      <p className="pt-2 pb-6">{videoData?.description}</p>
    </div>
  )
}

export default VideoDetails
// video
