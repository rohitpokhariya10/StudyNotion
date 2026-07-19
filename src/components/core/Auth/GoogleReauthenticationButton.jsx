import { useCallback, useEffect, useRef, useState } from "react"

import { loadGoogleIdentityServices } from "../../../utils/googleIdentity"

export default function GoogleReauthenticationButton({
  disabled = false,
  onCredential,
}) {
  const buttonRef = useRef(null)
  const [loadError, setLoadError] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
  const isConfigured = Boolean(clientId && !clientId.includes("replace-with"))

  const handleCredential = useCallback(
    ({ credential }) => {
      if (disabled || !credential) {
        if (!disabled) setLoadError(true)
        return
      }
      onCredential(credential)
    },
    [disabled, onCredential]
  )

  useEffect(() => {
    if (!isConfigured || disabled) return undefined

    let active = true
    const buttonElement = buttonRef.current

    loadGoogleIdentityServices()
      .then((google) => {
        if (!active || !buttonElement) return

        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
          context: "signin",
          ux_mode: "popup",
        })
        buttonElement.replaceChildren()
        google.accounts.id.renderButton(buttonElement, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: Math.min(buttonElement.clientWidth || 400, 400),
        })
        setLoadError(false)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })

    return () => {
      active = false
      buttonElement?.replaceChildren()
    }
  }, [clientId, disabled, handleCredential, isConfigured])

  if (!isConfigured) {
    return (
      <p className="text-sm text-pink-100" role="alert">
        Google re-authentication is not configured. Contact support before
        attempting account deletion.
      </p>
    )
  }

  if (disabled) {
    return (
      <p className="text-sm text-richblack-300">
        Confirm your account email above to enable Google re-authentication.
      </p>
    )
  }

  return (
    <div>
      <div
        ref={buttonRef}
        className="flex min-h-10 w-full justify-start overflow-hidden rounded-md"
        aria-label="Re-authenticate with Google"
      />
      {loadError && (
        <p className="mt-2 text-sm text-pink-100" role="alert">
          Google re-authentication is temporarily unavailable. No account
          changes were made.
        </p>
      )}
    </div>
  )
}
