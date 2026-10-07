import { useId, useState } from "react"
import { FiChevronDown } from "react-icons/fi"

// One answer open at a time; each question is a real button that controls a
// labelled answer region.
export default function FaqAccordion({ items }) {
  const id = useId()
  const [open, setOpen] = useState(-1)
  return (
    <div className="sn-faq-list">
      {items.map(([question, answer], index) => {
        const expanded = open === index
        return (
          <div
            key={question}
            className={`sn-faq-item ${expanded ? "is-open" : ""}`}
          >
            <h3>
              <button
                type="button"
                id={`${id}-q${index}`}
                aria-expanded={expanded}
                aria-controls={`${id}-a${index}`}
                onClick={() => setOpen(expanded ? -1 : index)}
              >
                <span>{question}</span>
                <FiChevronDown aria-hidden="true" />
              </button>
            </h3>
            <div
              id={`${id}-a${index}`}
              role="region"
              aria-labelledby={`${id}-q${index}`}
              hidden={!expanded}
              className="sn-faq-answer"
            >
              <p>{answer}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
