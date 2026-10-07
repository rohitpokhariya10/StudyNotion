import { useEffect, useRef, useState } from "react"
import { FiArrowLeft, FiArrowRight } from "react-icons/fi"

// `pagination` adds page dots beside the arrows (used on the blue review
// band); without it the carousel keeps its arrow-only controls.
export default function CardCarousel({
  children,
  label = "cards",
  count,
  inverse = false,
  pagination = false,
}) {
  const track = useRef(null)
  const [position, setPosition] = useState({
    start: true,
    end: true,
    page: 0,
    pages: 1,
  })
  useEffect(() => {
    const element = track.current
    const update = () => {
      const end =
        element.scrollLeft + element.clientWidth >= element.scrollWidth - 2
      const pages = Math.max(
        1,
        Math.ceil((element.scrollWidth - 2) / Math.max(1, element.clientWidth))
      )
      setPosition({
        start: element.scrollLeft < 2,
        end,
        pages,
        page: end
          ? pages - 1
          : Math.min(
              pages - 1,
              Math.round(element.scrollLeft / Math.max(1, element.clientWidth))
            ),
      })
    }
    update()
    element.addEventListener("scroll", update, { passive: true })
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null
    observer?.observe(element)
    return () => {
      element.removeEventListener("scroll", update)
      observer?.disconnect()
    }
  }, [count])
  const behavior = () =>
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth"
  function move(direction) {
    track.current.scrollBy({
      left: direction * track.current.clientWidth,
      behavior: behavior(),
    })
  }
  function show(page) {
    track.current.scrollTo({
      left: page * track.current.clientWidth,
      behavior: behavior(),
    })
  }
  return (
    <div>
      <ul tabIndex={0} ref={track} className="sn-carousel" aria-label={label}>
        {children}
      </ul>
      {pagination && !(position.start && position.end) && (
        <div className="sn-carousel-controls">
          <div className="sn-carousel-dots">
            {Array.from({ length: position.pages }, (_, page) => (
              <button
                key={page}
                type="button"
                className="sn-carousel-dot"
                aria-label={`Show ${label}, page ${page + 1} of ${position.pages}`}
                aria-current={page === position.page ? "true" : undefined}
                onClick={() => show(page)}
              />
            ))}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="sn-carousel-arrow"
              onClick={() => move(-1)}
              disabled={position.start}
              aria-label={`Previous ${label}`}
            >
              <FiArrowLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              className="sn-carousel-arrow"
              onClick={() => move(1)}
              disabled={position.end}
              aria-label={`Next ${label}`}
            >
              <FiArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      {!pagination && !(position.start && position.end) && (
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            className={`sn-btn sn-btn-icon ${inverse ? "sn-btn-light" : "sn-btn-secondary"}`}
            onClick={() => move(-1)}
            disabled={position.start}
            aria-label={`Previous ${label}`}
          >
            <FiArrowLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`sn-btn sn-btn-icon ${inverse ? "sn-btn-light" : "sn-btn-secondary"}`}
            onClick={() => move(1)}
            disabled={position.end}
            aria-label={`Next ${label}`}
          >
            <FiArrowRight aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
