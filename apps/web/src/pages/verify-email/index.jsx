import {
  sendOtp,
  signUp,
  VerificationCodeInput,
} from "@/features/authentication"
import AuthLayout from "@/shared/ui/AuthLayout"
import FlaskLoader from "@/shared/ui/FlaskLoader"
import { useEffect, useState } from "react"
import { BiArrowBack } from "react-icons/bi"
import { RxCountdownTimer } from "react-icons/rx"
import { useDispatch, useSelector } from "react-redux"
import { Link, useNavigate } from "react-router"

const RESEND_COOLDOWN_SECONDS = 30

function VerifyEmail() {
  const [otp, setOtp] = useState("")
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_SECONDS)
  const { signupData, loading } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    if (!signupData) navigate("/signup", { replace: true })
  }, [navigate, signupData])

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const timer = window.setInterval(
      () => setResendIn((seconds) => Math.max(0, seconds - 1)),
      1000
    )
    return () => window.clearInterval(timer)
  }, [resendIn])

  const handleVerifyAndSignup = (event) => {
    event.preventDefault()
    if (!signupData || otp.length !== 6) return

    dispatch(signUp(signupData, otp, navigate))
  }

  const handleResend = async () => {
    if (!signupData?.email || resendIn > 0 || loading) return
    const sent = await dispatch(sendOtp(signupData.email))
    if (sent) setResendIn(RESEND_COOLDOWN_SECONDS)
  }

  if (!signupData) return null

  return (
    <AuthLayout variant="signup">
      {loading ? (
        <div className="grid min-h-80 place-items-center" aria-busy="true">
          <FlaskLoader replacesLoadingToast label="Verifying email" />
        </div>
      ) : (
        <div>
          <h1 className="sn-heading">Verify Email</h1>
          <p className="mt-3 mb-8 text-[0.9375rem] leading-relaxed text-text-secondary">
            A verification code has been sent to you. Enter the code below.
          </p>
          <form onSubmit={handleVerifyAndSignup}>
            <VerificationCodeInput
              value={otp}
              onChange={(value) => setOtp(value.replace(/\D/g, ""))}
              autoFocus
            />
            <button
              type="submit"
              disabled={otp.length !== 6}
              className="sn-btn sn-btn-primary sn-btn-lg sn-btn-block mt-6"
            >
              Verify Email
            </button>
          </form>
          <div className="mt-6 flex items-center justify-between">
            <Link to="/signup">
              <span className="flex items-center gap-x-2 text-text-primary">
                <BiArrowBack /> Back To Signup
              </span>
            </Link>
            <button
              type="button"
              disabled={resendIn > 0 || loading}
              className="flex items-center gap-x-2 text-brand-primary disabled:cursor-not-allowed disabled:text-text-secondary"
              onClick={handleResend}
            >
              <RxCountdownTimer />
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}

export default VerifyEmail
