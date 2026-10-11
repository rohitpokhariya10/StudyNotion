import logo from "@/shared/assets/brand/prahit-jelly-duo.webp"

import "./brandLogo.css"

// The supplied artwork is cropped and resized only; its supplied transparency is retained.
// A surrounding labelled link supplies the name when decorative is true.
export default function BrandLogo({
  size = "nav",
  decorative = false,
  className = "",
}) {
  return (
    <img
      src={logo}
      width="640"
      height="512"
      alt={decorative ? "" : "Prahit"}
      aria-hidden={decorative || undefined}
      decoding="async"
      className={`sn-brand-logo sn-brand-logo-${size} ${className}`}
    />
  )
}
