import { useCallback, useEffect, useRef, useState } from "react"

// Minimal loader hook for Project NEET reads. Requests are aborted on unmount
// or when inputs change, so stale responses never overwrite newer state.
export function useNeetResource(loader, dependencies) {
  const [state, setState] = useState({
    status: "loading",
    data: null,
    error: null,
  })
  const [generation, setGeneration] = useState(0)
  const loaderRef = useRef(loader)
  useEffect(() => {
    loaderRef.current = loader
  }, [loader])

  useEffect(() => {
    const controller = new AbortController()
    // The external request lifecycle explicitly publishes its loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((current) => ({ ...current, status: "loading", error: null }))
    loaderRef
      .current({ signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ status: "success", data, error: null })
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ status: "error", data: null, error })
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, generation])

  const reload = useCallback(() => setGeneration((value) => value + 1), [])
  const replace = useCallback(
    (data) => setState({ status: "success", data, error: null }),
    []
  )
  return { ...state, reload, replace }
}
