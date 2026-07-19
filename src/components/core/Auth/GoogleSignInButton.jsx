import { useCallback, useEffect, useRef, useState } from "react"
import { useDispatch } from "react-redux"
import { useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"

import { googleLogin } from "../../../services/operations/authAPI"
import { loadGoogleIdentityServices } from "../../../utils/googleIdentity"
import { hasCompletePolicyAcknowledgement } from "../../../utils/policyAcknowledgement"

export default function GoogleSignInButton({
  policyAcknowledgement,
  requirePolicyAcknowledgement = false,
}) {
  const buttonRef = useRef(null)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [loadError, setLoadError] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
  const isConfigured = Boolean(clientId && !clientId.includes("replace-with"))

  const handleCredential = useCallback(
    ({ credential }) => {
      if (!credential) {
        setLoadError(true)
        return
      }
      if (
        requirePolicyAcknowledgement &&
        !hasCompletePolicyAcknowledgement(policyAcknowledgement)
      ) {
        toast.error("Complete the account agreement before continuing with Google")
        return
      }
      dispatch(googleLogin(credential, navigate, policyAcknowledgement))
    },
    [
      dispatch,
      navigate,
      policyAcknowledgement,
      requirePolicyAcknowledgement,
    ]
  )

  useEffect(() => {
    if (!isConfigured) return undefined

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
  }, [clientId, handleCredential, isConfigured])

  if (!isConfigured) {
    return import.meta.env.DEV ? (
      <p className="text-center text-xs text-richblack-300" role="status">
        Set VITE_GOOGLE_CLIENT_ID to enable Google sign-in.
      </p>
    ) : null
  }

  return (
    <div className="w-full">
      <div
        ref={buttonRef}
        className="flex min-h-10 w-full justify-center overflow-hidden rounded-md"
        aria-label="Continue with Google"
      />
      {loadError && (
        <p className="mt-2 text-center text-xs text-pink-200" role="alert">
          Google sign-in is temporarily unavailable. You can still use email.
        </p>
      )}
    </div>
  )
}
