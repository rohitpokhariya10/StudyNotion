import { formatSignedMarks, NeetRichText, subjectStyle } from "@/entities/neet"

function OptionChoice({ disabled, name, onChange, option, selected }) {
  return (
    <label
      className="pn-option cursor-pointer"
      data-selected={selected ? "true" : "false"}
    >
      <input
        type="radio"
        name={name}
        value={option.key}
        checked={selected}
        onChange={() => onChange(option.key)}
        disabled={disabled}
        className="h-5 w-5 shrink-0 accent-neet-accent"
      />
      <span className="pn-option-key" aria-hidden="true">
        {option.key}
      </span>
      <span className="sr-only">{option.key}.</span>
      <NeetRichText value={option.text} className="pn-option-text" />
    </label>
  )
}

// Calm reading surface: generous spacing, large targets, no transitions
// between questions. Text is rendered as React text nodes only.
export function QuestionCard({
  disabled,
  onAnswer,
  question,
  response,
  section,
  total,
}) {
  return (
    <article className="pn-card p-5 sm:p-8" aria-labelledby="question-title">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="flex items-center gap-2 font-semibold text-neet-muted">
          {section && (
            <>
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full ${subjectStyle(section.subjectKey).bg}`}
              />
              <span className={subjectStyle(section.subjectKey).text}>
                {section.subjectLabel}
              </span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span>
            Question {question.number}
            {total ? ` of ${total}` : ""}
          </span>
        </p>
        <p className="pn-chip border-neet-line">
          <span className="sr-only">
            Marks: {formatSignedMarks(question.marks.correct)} if correct,{" "}
            {formatSignedMarks(question.marks.incorrect)} if incorrect
          </span>
          <span aria-hidden="true" className="pn-tabular">
            <span className="text-neet-success">
              {formatSignedMarks(question.marks.correct)}
            </span>
            {" / "}
            <span className="text-neet-danger">
              {formatSignedMarks(question.marks.incorrect)}
            </span>
          </span>
        </p>
      </div>
      <h2 id="question-title" className="pn-question-text mb-7 font-semibold">
        <span className="sr-only">Question {question.number}. </span>
        <NeetRichText value={question.text} />
      </h2>
      {question.media.map((item) => (
        <figure key={item.url} className="mb-7">
          <img
            src={item.url}
            alt={item.alt}
            width={item.width || undefined}
            height={item.height || undefined}
            loading="lazy"
            decoding="async"
            className="h-auto max-h-80 w-auto max-w-full rounded-xl border border-neet-line bg-white p-3"
          />
        </figure>
      ))}
      <fieldset disabled={disabled} className="space-y-3">
        <legend className="sr-only">
          Choose one answer for question {question.number}
        </legend>
        {question.options.map((option) => (
          <OptionChoice
            key={option.key}
            option={option}
            name={`question-${question.id}`}
            selected={response?.selectedOption === option.key}
            onChange={onAnswer}
            disabled={disabled}
          />
        ))}
      </fieldset>
    </article>
  )
}
