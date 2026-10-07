import { emptyPolicyAcknowledgement } from "@/features/authentication/lib/policyAcknowledgement"
import GoogleSignInButton from "@/features/authentication/ui/GoogleSignInButton"
import LoginForm from "@/features/authentication/ui/LoginForm"
import SignupForm from "@/features/authentication/ui/SignupForm"
import AuthLayout, { AuthHeading } from "@/shared/ui/AuthLayout"
import FlaskLoader from "@/shared/ui/FlaskLoader"
import { useState } from "react"
import { useSelector } from "react-redux"
import { Link } from "react-router"

function Template({ title, description1, description2, formType }) {
  const { loading } = useSelector((state) => state.auth)
  const [policyAcknowledgement, setPolicyAcknowledgement] = useState(
    emptyPolicyAcknowledgement
  )
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
  const googleIdentityEnabled = Boolean(
    googleClientId && !googleClientId.includes("replace-with")
  )

  return (
    <AuthLayout variant={formType === "signup" ? "signup" : "login"}>
      {loading ? (
        <div className="grid min-h-80 place-items-center" aria-busy="true">
          <FlaskLoader
            replacesLoadingToast
            label={
              formType === "signup" ? "Sending verification code" : "Signing in"
            }
          />
        </div>
      ) : (
        <>
          <AuthHeading title={title}>
            <p className="mt-3 text-[0.9375rem] leading-relaxed">
              <span className="text-text-secondary">{description1}</span>{" "}
              <span className="font-medium text-brand-primary">
                {description2}
              </span>
            </p>
          </AuthHeading>
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
              <div className="my-6 flex w-full items-center gap-x-3">
                <div className="h-px flex-1 bg-border-default" />
                <span className="text-sm text-text-secondary">or</span>
                <div className="h-px flex-1 bg-border-default" />
              </div>
              <GoogleSignInButton
                requirePolicyAcknowledgement={formType === "signup"}
                policyAcknowledgement={policyAcknowledgement}
              />
              {formType === "signup" && (
                <p className="mt-3 text-center text-xs text-text-secondary">
                  Google sign-up creates a Student account. Instructor
                  onboarding is completed separately.
                </p>
              )}
            </>
          )}
          <p className="mt-8 text-center text-sm text-text-secondary">
            {formType === "signup" ? (
              <>
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-brand-primary hover:underline"
                >
                  Log in
                </Link>
              </>
            ) : (
              <>
                New to Prahit?{" "}
                <Link
                  to="/signup"
                  className="font-medium text-brand-primary hover:underline"
                >
                  Create a free account
                </Link>
              </>
            )}
          </p>
        </>
      )}
    </AuthLayout>
  )
}

export default Template
