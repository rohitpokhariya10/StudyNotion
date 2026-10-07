import fallback from "@/shared/assets/editorial/course.svg"
import { useState } from "react"

export default function CourseImage({ src, alt = "", ...props }) {
  const [failedSource, setFailedSource] = useState(null)
  const unavailable = !src || failedSource === src
  return (
    <img
      {...props}
      src={unavailable ? fallback : src}
      alt={unavailable && alt ? `${alt} (image unavailable)` : alt}
      onError={() => setFailedSource(src)}
    />
  )
}
