import ledgeImage from "@/shared/assets/auth-scene/ledge.webp"
import { YETI_ASPECT, YetiMascot } from "@/shared/ui/yeti-mascot"
import { useCallback, useState } from "react"

import AuthSky from "./AuthSky"
import { AuthPrivacyContext } from "./privacy"

import "@fontsource-variable/bricolage-grotesque/standard.css"
import "./authScene.css"

// Sign-in and sign-up layout: a white card on a cloudy sky with the 3D yeti
// on the left and the form on the right (stacked below a banner on small
// screens). Password fields inside report focus/visibility through
// usePrivateField, which closes the mascot's eyes. `form` ("login" or
// "signup") lets the longer sign-up form use a more compact rhythm.
export default function AuthScene({ children, form }) {
  const [privateFields, setPrivateFields] = useState(() => new Set())
  const report = useCallback((id, hidden) => {
    setPrivateFields((current) => {
      if (current.has(id) === hidden) return current
      const next = new Set(current)
      if (hidden) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  return (
    <main className="sn-auth-scene" data-form={form}>
      <AuthSky />
      <div className="sn-auth-card">
        <div
          className="sn-auth-visual"
          style={{ "--yeti-aspect": YETI_ASPECT }}
        >
          <AuthSky panel />
          <span className="sn-auth-ground" aria-hidden="true" />
          <img className="sn-auth-ledge" src={ledgeImage} alt="" />
          <YetiMascot
            className="sn-auth-mascot"
            eyesClosed={privateFields.size > 0}
          />
          <p className="sn-auth-tagline" aria-hidden="true">
            <span>Explore.</span> <span>Learn. Grow.</span>
          </p>
        </div>
        <div className="sn-auth-panel">
          <AuthPrivacyContext.Provider value={report}>
            <div className="sn-auth-panel-inner">{children}</div>
          </AuthPrivacyContext.Provider>
        </div>
      </div>
    </main>
  )
}
