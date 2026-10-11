import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react"

// Password fields report whether they are focused or revealed so the mascot
// can close its eyes. Only that boolean is shared; values are never read.
export const AuthPrivacyContext = createContext(null)

// Returns focus handlers for a password input. `revealed` is the field's
// visibility toggle state. Outside an AuthScene this is a no-op.
export function usePrivateField(revealed = false) {
  const report = useContext(AuthPrivacyContext)
  const id = useId()
  const [focused, setFocused] = useState(false)
  const hidden = focused || revealed
  useEffect(() => {
    if (!report) return undefined
    report(id, hidden)
    return () => report(id, false)
  }, [report, id, hidden])
  return useMemo(
    () => ({
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    }),
    []
  )
}
