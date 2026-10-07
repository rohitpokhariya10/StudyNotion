import { formatNeetClock, formatNeetClockForSpeech } from "@/entities/neet"
import { FiClock } from "react-icons/fi"

const MILESTONE_MINUTES = [30, 10, 5, 1]

// The countdown re-renders once per tick on its own; it never animates. A
// polite live region speaks only at a few milestones instead of every second.
export function ExamTimer({ remainingMs }) {
  const minutesLeft = remainingMs / 60_000
  const milestone = MILESTONE_MINUTES.find(
    (minutes) => minutesLeft <= minutes && minutesLeft > minutes - 1
  )
  const low = remainingMs <= 5 * 60_000
  const critical = remainingMs <= 60_000
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 ${
        critical
          ? "border-neet-danger bg-neet-danger/10 text-neet-danger"
          : low
            ? "border-neet-warning bg-neet-warning/10 text-neet-warning"
            : "border-neet-line bg-neet-surface text-neet-ink"
      }`}
    >
      <FiClock aria-hidden="true" className="hidden text-lg sm:block" />
      <span className="sr-only sm:not-sr-only sm:text-xs sm:font-semibold sm:text-neet-muted">
        Time left
      </span>
      <span
        role="timer"
        aria-label={formatNeetClockForSpeech(remainingMs)}
        className="pn-tabular text-lg font-bold sm:text-xl"
      >
        {formatNeetClock(remainingMs)}
      </span>
      {low && (
        <span className="hidden text-xs font-bold uppercase sm:inline">
          {critical ? "Final minute" : "Under 5 min"}
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {milestone
          ? `${milestone} minute${milestone === 1 ? "" : "s"} remaining`
          : ""}
      </span>
    </div>
  )
}
