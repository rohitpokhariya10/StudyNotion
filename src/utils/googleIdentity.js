const GIS_SCRIPT_ID = "google-identity-services"
const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client"
const GIS_SCRIPT_TIMEOUT_MS = 15_000

let gisScriptPromise

export const loadGoogleIdentityServices = () => {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google)
  }

  if (gisScriptPromise) return gisScriptPromise

  gisScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GIS_SCRIPT_ID)
    const script = existingScript || document.createElement("script")
    let settled = false

    const cleanup = () => {
      clearTimeout(timeout)
      script.removeEventListener("load", handleLoad)
      script.removeEventListener("error", handleError)
    }

    const finish = (error) => {
      if (settled) return
      settled = true
      cleanup()
      if (error) {
        gisScriptPromise = undefined
        if (!window.google?.accounts?.id) script.remove()
        reject(error)
      } else {
        resolve(window.google)
      }
    }

    const handleLoad = () => {
      if (window.google?.accounts?.id) {
        finish()
      } else {
        finish(new Error("Google Identity Services did not initialize"))
      }
    }

    const handleError = () => {
      finish(new Error("Google Identity Services could not be loaded"))
    }

    const timeout = setTimeout(
      () => finish(new Error("Google Identity Services loading timed out")),
      GIS_SCRIPT_TIMEOUT_MS
    )

    script.addEventListener("load", handleLoad)
    script.addEventListener("error", handleError)

    if (!existingScript) {
      script.id = GIS_SCRIPT_ID
      script.src = GIS_SCRIPT_SRC
      script.async = true
      script.defer = true
      script.referrerPolicy = "strict-origin-when-cross-origin"
      document.head.appendChild(script)
    }
  })

  return gisScriptPromise
}
