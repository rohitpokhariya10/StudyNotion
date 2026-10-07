import footerLandscape from "@/shared/assets/editorial/footer-landscape.svg"
import { useState } from "react"

// Original layered mountain and forest scene behind the footer. It is purely
// decorative: hidden from assistive technology, never a pointer target, and
// loaded lazily because the footer always starts below the fold. The CSS
// behind it paints the same navy, so text stays readable before it loads,
// and a fuller gradient takes over if it cannot load at all.
export default function FooterLandscape() {
  const [failed, setFailed] = useState(false)
  return (
    <div
      className={`sn-footer-scene ${failed ? "sn-footer-scene-fallback" : ""}`}
      aria-hidden="true"
    >
      {!failed && (
        <img
          className="sn-footer-art"
          src={footerLandscape}
          width="1440"
          height="600"
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
