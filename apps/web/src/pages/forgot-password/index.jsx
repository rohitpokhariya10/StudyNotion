import { getPasswordResetToken } from "@/features/authentication"
import AuthLayout from "@/shared/ui/AuthLayout"
import FlaskLoader from "@/shared/ui/FlaskLoader"
import { useState } from "react"
import { BiArrowBack } from "react-icons/bi"
import { useDispatch, useSelector } from "react-redux"
import { Link } from "react-router"

function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const dispatch = useDispatch()
  const { loading } = useSelector((state) => state.auth)

  const handleOnSubmit = (e) => {
    e.preventDefault()
    dispatch(getPasswordResetToken(email, setEmailSent))
  }

  return (
    <AuthLayout variant="recovery">
      {loading ? (
        <div className="grid min-h-80 place-items-center" aria-busy="true">
          <FlaskLoader
            replacesLoadingToast
            label="Sending reset link"
            accessibleLabel="Sending password reset link"
          />
        </div>
      ) : (
        <div>
          <h1 className="sn-heading">
            {!emailSent ? "Reset your password" : "Check email"}
          </h1>
          <p className="mt-3 mb-8 text-[0.9375rem] leading-relaxed text-text-secondary">
            {!emailSent
              ? "Enter your account email and we'll send a secure, time-limited reset link. If you no longer have access to that inbox, contact support."
              : `We have sent the reset email to ${email}`}
          </p>
          <form onSubmit={handleOnSubmit}>
            {!emailSent && (
              <label className="w-full">
                <p className="mb-1 text-[0.875rem] leading-[1.375rem] text-text-primary">
                  Email Address <sup className="text-danger">*</sup>
                </p>
                <input
                  required
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="form-style w-full"
                />
              </label>
            )}
            <button
              type="submit"
              className="sn-btn sn-btn-primary sn-btn-lg sn-btn-block mt-6"
            >
              {!emailSent ? "Send reset link" : "Resend email"}
            </button>
          </form>
          <div className="mt-6 flex items-center justify-between">
            <Link to="/login">
              <p className="flex items-center gap-x-2 text-text-primary">
                <BiArrowBack /> Back To Login
              </p>
            </Link>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}

export default ForgotPassword
