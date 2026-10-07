import { getAvatarSource, setInitialsAvatarOnError } from "@/entities/user"
import FlaskLoader from "@/shared/ui/FlaskLoader"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"

import { usePublicInstructors } from "../model/publicInstructors"

import "./instructorStrip.css"

const reducedMotion = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  } catch {
    return false
  }
}

function InstructorCard({ instructor, hidden = false }) {
  const [first, ...rest] = String(instructor.name).trim().split(/\s+/)
  const person = {
    image: instructor.imageUrl,
    firstName: first,
    lastName: rest.join(" "),
  }
  const source = getAvatarSource(person)
  // getAvatarSource falls back to generated initials when there is no usable
  // photo; show those as a portrait-sized monogram instead.
  const monogram = source !== String(instructor.imageUrl || "").trim()
  const initials = [first, rest.at(-1)]
    .filter(Boolean)
    .map((part) => Array.from(part)[0].toUpperCase())
    .join("")
  return (
    <li aria-hidden={hidden || undefined}>
      <Link
        to={`/courses/${instructor.courseId}`}
        className="sn-strip-card"
        tabIndex={hidden ? -1 : undefined}
      >
        {monogram ? (
          <span className="sn-strip-photo sn-strip-monogram" aria-hidden="true">
            {initials}
          </span>
        ) : (
          <img
            className="sn-strip-photo"
            src={source}
            onError={(event) => setInitialsAvatarOnError(event, person)}
            alt=""
            width="208"
            height="256"
            loading="lazy"
            decoding="async"
          />
        )}
        <span className="sn-strip-label">
          <strong>{instructor.name}</strong>
          <span>
            Instructor{instructor.subject ? ` · ${instructor.subject}` : ""}
          </span>
          <span className="sr-only">, teaches {instructor.courseName}</span>
        </span>
      </Link>
    </li>
  )
}

// Moves like the reference strip only when there are enough profiles to fill
// the row; small lists stay still and centred, so nobody is repeated to look
// like a bigger team. Hover or keyboard focus hands control back to the user.
function InstructorTrack({ instructors }) {
  const viewport = useRef(null)
  const list = useRef(null)
  const [overflowing, setOverflowing] = useState(false)
  const [manual, setManual] = useState(reducedMotion)

  useEffect(() => {
    const measure = () => {
      if (!viewport.current || !list.current) return
      const cards = list.current.querySelectorAll("li:not([aria-hidden])")
      const width = [...cards].reduce(
        (sum, card) => sum + card.getBoundingClientRect().width + 24,
        0
      )
      setOverflowing(width > viewport.current.clientWidth + 1)
    }
    measure()
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure)
    observer?.observe(viewport.current)
    return () => observer?.disconnect()
  }, [instructors.length])

  const moving = overflowing && !manual
  return (
    <div
      ref={viewport}
      className={`sn-strip-viewport ${moving ? "is-moving" : ""} ${
        overflowing ? "" : "is-centered"
      }`}
      onFocus={() => setManual(true)}
    >
      <ul
        ref={list}
        className="sn-strip-track"
        aria-label="Instructors"
        style={{ "--sn-strip-duration": `${instructors.length * 4.7}s` }}
      >
        {instructors.map((instructor) => (
          <InstructorCard key={instructor.id} instructor={instructor} />
        ))}
        {moving &&
          instructors.map((instructor) => (
            <InstructorCard
              key={`copy-${instructor.id}`}
              instructor={instructor}
              hidden
            />
          ))}
      </ul>
    </div>
  )
}

export default function InstructorStrip({ headingId, intro, title }) {
  const { instructors, isError, isLoading, refetch } = usePublicInstructors()
  return (
    <section
      className="sn-strip sn-block-gradient"
      aria-labelledby={headingId}
      aria-busy={isLoading || undefined}
    >
      <div className="sn-strip-head">
        <h2 id={headingId}>{title}</h2>
        {intro && <p>{intro}</p>}
      </div>
      {isLoading ? (
        <div className="sn-strip-state">
          <FlaskLoader tone="inverse" label="Loading instructors" />
        </div>
      ) : isError ? (
        <div className="sn-strip-state" role="alert">
          <p>Instructor profiles are unavailable right now.</p>
          <button
            type="button"
            className="sn-btn sn-btn-light"
            onClick={refetch}
          >
            Retry instructors
          </button>
        </div>
      ) : !instructors.length ? (
        <div className="sn-strip-state">
          <p>Instructor profiles appear here as their courses are published.</p>
          <Link to="/careers" className="sn-btn sn-btn-light">
            Teach on Prahit
          </Link>
        </div>
      ) : (
        <InstructorTrack instructors={instructors} />
      )}
    </section>
  )
}
