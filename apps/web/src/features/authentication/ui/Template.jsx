import { emptyPolicyAcknowledgement } from "@/features/authentication/lib/policyAcknowledgement"
import GoogleSignInButton from "@/features/authentication/ui/GoogleSignInButton"
import LoginForm from "@/features/authentication/ui/LoginForm"
import SignupForm from "@/features/authentication/ui/SignupForm"
import { AuthScene } from "@/shared/ui/auth-scene"
import FlaskLoader from "@/shared/ui/FlaskLoader"
import { useState } from "react"
import { useSelector } from "react-redux"
import { Link } from "react-router"

function Template({ title, description, formType }) {
  const { loading } = useSelector((state) => state.auth)
  const [policyAcknowledgement, setPolicyAcknowledgement] = useState(
    emptyPolicyAcknowledgement
  )
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
  const googleIdentityEnabled = Boolean(
    googleClientId && !googleClientId.includes("replace-with")
  )

  return (
    <AuthScene form={formType}>
      <header className="sn-auth-head">
        <h1 className="sn-auth-title">{title}</h1>
        <p className="sn-auth-lead">{description}</p>
      </header>
      {loading ? (
        <div className="sn-auth-loading" aria-busy="true">
          <FlaskLoader
            replacesLoadingToast
            label={
              formType === "signup" ? "Sending verification code" : "Signing in"
            }
          />
        </div>
      ) : (
        <>
          {formType === "signup" ? (
            <SignupForm
              policyAcknowledgement={policyAcknowledgement}
              setPolicyAcknowledgement={setPolicyAcknowledgement}
            />
          ) : (
            <LoginForm />
          )}
          {googleIdentityEnabled && (
            <>
              <div className="sn-auth-divider">or</div>
              <GoogleSignInButton
                requirePolicyAcknowledgement={formType === "signup"}
                policyAcknowledgement={policyAcknowledgement}
              />
              {formType === "signup" && (
                <p className="sn-auth-note">
                  Google sign-up creates a Student account. Instructor
                  onboarding is completed separately.
                </p>
              )}
            </>
          )}
          <p className="sn-auth-switch">
            {formType === "signup" ? (
              <>
                Already have an account? <Link to="/login">Sign in</Link>
              </>
            ) : (
              <>
                Don’t have an account? <Link to="/signup">Sign up</Link>
              </>
            )}
          </p>
        </>
      )}
    </AuthScene>
  )
}

export default Template
