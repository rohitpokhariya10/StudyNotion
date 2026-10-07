// Consistent section heading block: optional eyebrow, title, description.
export default function SectionHeader({
  align = "left",
  as: Heading = "h2",
  description,
  eyebrow,
  id,
  title,
  tone = "default",
  className = "",
}) {
  const centered = align === "center"
  const inverse = tone === "inverse"
  return (
    <div
      className={`${centered ? "mx-auto text-center" : ""} max-w-3xl ${className}`}
    >
      {eyebrow && (
        <p className={`sn-eyebrow ${inverse ? "text-white/80" : ""}`}>
          {eyebrow}
        </p>
      )}
      <Heading id={id} className={`sn-heading ${inverse ? "text-white" : ""}`}>
        {title}
      </Heading>
      {description && (
        <p
          className={`sn-lead mt-4 ${centered ? "mx-auto" : ""} ${
            inverse ? "text-white/85" : ""
          }`}
        >
          {description}
        </p>
      )}
    </div>
  )
}
