import ReactMarkdown from "react-markdown"

const allowedElements = [
  "a",
  "blockquote",
  "br",
  "code",
  "em",
  "h2",
  "h3",
  "h4",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "ul",
]

const safeLink = (href) => {
  try {
    const url = new URL(href)
    return url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

export default function SafeMarkdown({ children }) {
  return (
    <ReactMarkdown
      allowedElements={allowedElements}
      components={{
        a: ({ children: linkText, href }) => {
          const safeHref = safeLink(href)
          return safeHref ? (
            <a
              href={safeHref}
              target="_blank"
              rel="nofollow noreferrer noopener"
              className="text-yellow-100 underline underline-offset-2"
            >
              {linkText}
            </a>
          ) : (
            <span>{linkText}</span>
          )
        },
      }}
      unwrapDisallowed
    >
      {String(children || "")}
    </ReactMarkdown>
  )
}
