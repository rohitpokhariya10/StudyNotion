// The exam keeps a reading-optimised face for long sessions (self-hosted).
import "@fontsource-variable/atkinson-hyperlegible-next"
import "./NeetFonts"

// Calm exam focus-mode frame. No navigation chrome, no decorative motion.
export function ExamFocusShell({ children, className = "" }) {
  return (
    <div className={`pn-root pn-exam flex min-h-dvh flex-col ${className}`}>
      {children}
    </div>
  )
}
