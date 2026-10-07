import { useEffect, useRef } from "react"

// Marks an element visible once it scrolls into view (`data-visible="true"`).
// CSS owns the motion and disables it under prefers-reduced-motion; without
// IntersectionObserver the element is shown immediately.
export default function useRevealOnScroll({
  rootMargin = "0px 0px -10% 0px",
} = {}) {
  const ref = useRef(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return undefined
    if (typeof IntersectionObserver !== "function") {
      element.dataset.visible = "true"
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Also reveal content the reader has already scrolled past (for
          // example after jumping to an anchor) so nothing stays hidden.
          if (!entry.isIntersecting && entry.boundingClientRect.top >= 0)
            continue
          entry.target.dataset.visible = "true"
          observer.unobserve(entry.target)
        }
      },
      { rootMargin }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [rootMargin])
  return ref
}
