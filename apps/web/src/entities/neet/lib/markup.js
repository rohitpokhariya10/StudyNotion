// Question text supports a deliberately tiny markup: _{...} for subscript and
// ^{...} for superscript. Parsing produces plain data that React renders as
// text nodes, so question content can never inject HTML.
const TOKEN_PATTERN = /([_^])\{([^{}]{0,40})\}/g

export const parseNeetMarkup = (value) => {
  const text = String(value ?? "")
  const segments = []
  let cursor = 0
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    if (match.index > cursor) {
      segments.push({ kind: "text", value: text.slice(cursor, match.index) })
    }
    segments.push({ kind: match[1] === "_" ? "sub" : "sup", value: match[2] })
    cursor = match.index + match[0].length
  }
  if (cursor < text.length)
    segments.push({ kind: "text", value: text.slice(cursor) })
  return segments
}

// Screen readers and plain-text contexts (aria labels, titles).
export const neetMarkupToPlainText = (value) =>
  parseNeetMarkup(value)
    .map((segment) => segment.value)
    .join("")
