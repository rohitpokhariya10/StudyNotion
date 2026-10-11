import "@fontsource-variable/inter-tight"
import "../styles/wordmark.css"

// Typographic Prahit NEET Mocks wordmark: "NEET" heavy, "Mocks" regular, on
// one baseline in Inter Tight. Callers set the size with font-size; the
// colour follows currentColor. The real space keeps the accessible name
// "NEET Mocks" while CSS tightens it optically.
export function NeetWordmark({ className = "" }) {
  return (
    <span className={`neet-wordmark ${className}`}>
      <span className="neet-wordmark-strong">NEET</span>{" "}
      <span className="neet-wordmark-light">Mocks</span>
    </span>
  )
}
