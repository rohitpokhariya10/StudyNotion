import { useEffect, useState } from "react"
import { BiArrowBack } from "react-icons/bi"
import { RxCountdownTimer } from "react-icons/rx"
import OtpInput from "react-otp-input"
import { useDispatch, useSelector } from "react-redux"
import { Link, useNavigate } from "react-router-dom"

import { sendOtp, signUp } from "../services/operations/authAPI"

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
    <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
      {loading ? (
        <div className="spinner" role="status" aria-label="Verifying email" />
      ) : (
        <div className="max-w-[500px] p-4 lg:p-8">
          <h1 className="text-[1.875rem] font-semibold leading-[2.375rem] text-richblack-5">
            Verify Email
          </h1>
          <p className="my-4 text-[1.125rem] leading-[1.625rem] text-richblack-100">
            A verification code has been sent to you. Enter the code below.
          </p>
          <form onSubmit={handleVerifyAndSignup}>
            <OtpInput
              value={otp}
              onChange={(value) => setOtp(value.replace(/\D/g, ""))}
              numInputs={6}
              shouldAutoFocus
              inputType="text"
              renderInput={(props, index) => (
                <input
                  {...props}
                  aria-label={`Verification code digit ${index + 1}`}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="-"
                  style={{
                    boxShadow: "inset 0px -1px 0px rgba(255, 255, 255, 0.18)",
                  }}
                  className="aspect-square w-[48px] rounded-[0.5rem] border-0 bg-richblack-800 text-center text-richblack-5 focus:border-0 focus:outline-2 focus:outline-yellow-50 lg:w-[60px]"
                />
              )}
              containerStyle={{
                justifyContent: "space-between",
                gap: "0 6px",
              }}
            />
            <button
              type="submit"
              disabled={otp.length !== 6}
              className="mt-6 w-full rounded-[8px] bg-yellow-50 px-[12px] py-[12px] font-medium text-richblack-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Verify Email
            </button>
          </form>
          <div className="mt-6 flex items-center justify-between">
            <Link to="/signup">
              <span className="flex items-center gap-x-2 text-richblack-5">
                <BiArrowBack /> Back To Signup
              </span>
            </Link>
            <button
              type="button"
              disabled={resendIn > 0 || loading}
              className="flex items-center gap-x-2 text-blue-100 disabled:cursor-not-allowed disabled:text-richblack-400"
              onClick={handleResend}
            >
              <RxCountdownTimer />
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default VerifyEmail
