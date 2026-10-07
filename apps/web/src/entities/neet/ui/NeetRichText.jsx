import { parseNeetMarkup } from "@/entities/neet/lib/markup"

// Renders question/option text with sub/superscript support as React text
// nodes only. No HTML string is ever interpreted.
export function NeetRichText({ as: Component = "span", className, value }) {
  const segments = parseNeetMarkup(value)
  return (
    <Component className={className}>
      {segments.map((segment, index) =>
        segment.kind === "sub" ? (
          <sub key={index}>{segment.value}</sub>
        ) : segment.kind === "sup" ? (
          <sup key={index}>{segment.value}</sup>
        ) : (
          <span key={index}>{segment.value}</span>
        )
      )}
    </Component>
  )
}
