import { useId, useState } from "react"
import { FiChevronRight } from "react-icons/fi"

// Text beside a rounded landscape image (reversed rows put the image first).
// "Read More" reveals the rest of the story in place.
export default function StoryRow({
  action,
  image,
  imageAlt,
  more,
  reverse = false,
  summary,
  title,
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <section
      className={`sn-story ${reverse ? "sn-story-reverse" : ""}`}
      aria-labelledby={`${id}-title`}
    >
      <div className="sn-story-grid">
        <div className="sn-story-copy">
          <h2 id={`${id}-title`} className="sn-story-title">
            {title}
          </h2>
          <div className="sn-story-text">{summary}</div>
          {more && (
            <>
              <div
                id={`${id}-more`}
                className="sn-story-text sn-story-more"
                hidden={!open}
              >
                {more}
              </div>
              <button
                type="button"
                className="sn-read-more"
                aria-expanded={open}
                aria-controls={`${id}-more`}
                onClick={() => setOpen((value) => !value)}
              >
                {open ? "Read Less" : "Read More"}
                <FiChevronRight aria-hidden="true" />
              </button>
            </>
          )}
          {action}
        </div>
        <img
          className="sn-story-image"
          src={image}
          alt={imageAlt}
          width="397"
          height="288"
          loading="lazy"
          decoding="async"
        />
      </div>
    </section>
  )
}
