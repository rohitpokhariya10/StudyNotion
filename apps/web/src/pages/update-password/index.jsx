import { resetPassword } from "@/features/authentication"
import AuthLayout from "@/shared/ui/AuthLayout"
import FlaskLoader from "@/shared/ui/FlaskLoader"
import { useEffect, useState } from "react"
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai"
import { BiArrowBack } from "react-icons/bi"
import { useDispatch, useSelector } from "react-redux"
import { Link, useLocation, useNavigate } from "react-router"

function UpdatePassword() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const location = useLocation()
  const { loading } = useSelector((state) => state.auth)
  const [resetToken] = useState(() => {
    if (typeof window === "undefined") return ""
    const fragment = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash
    return new URLSearchParams(fragment).get("token") || ""
  })
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { password, confirmPassword } = formData

  useEffect(() => {
    // Remove the bearer token from the address bar and browser history as soon
    // as this component has retained it in memory.
    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        `${location.pathname}${location.search}`
      )
    }
  }, [location.pathname, location.search])

  const handleOnChange = (e) => {
    setFormData((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value,
    }))
  }

  const handleOnSubmit = (e) => {
    e.preventDefault()
    if (!resetToken) return
    dispatch(resetPassword(password, confirmPassword, resetToken, navigate))
  }

  return (
    <AuthLayout variant="recovery">
      {loading ? (
        <div className="grid min-h-80 place-items-center" aria-busy="true">
          <FlaskLoader replacesLoadingToast label="Resetting password" />
        </div>
      ) : (
        <div>
          <h1 className="sn-heading">Choose new password</h1>
          <p className="mt-3 mb-8 text-[0.9375rem] leading-relaxed text-text-secondary">
            {resetToken
              ? "Almost done. Enter your new password and you're all set."
              : "This password reset link is invalid or incomplete. Request a new link to continue."}
          </p>
          {resetToken ? (
            <form onSubmit={handleOnSubmit}>
              <label className="relative">
                <p className="mb-1 text-[0.875rem] leading-[1.375rem] text-text-primary">
                  New Password <sup className="text-danger">*</sup>
                </p>
                <input
                  required
                  maxLength={72}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={password}
                  onChange={handleOnChange}
                  placeholder="Enter Password"
                  className="form-style w-full pr-10!"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute top-[38px] right-3 z-[10] cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <AiOutlineEyeInvisible fontSize={24} fill="#AFB2BF" />
                  ) : (
                    <AiOutlineEye fontSize={24} fill="#AFB2BF" />
                  )}
                </button>
              </label>
              <label className="relative mt-3 block">
                <p className="mb-1 text-[0.875rem] leading-[1.375rem] text-text-primary">
                  Confirm New Password <sup className="text-danger">*</sup>
                </p>
                <input
                  required
                  maxLength={72}
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={handleOnChange}
                  placeholder="Confirm Password"
                  className="form-style w-full pr-10!"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute top-[38px] right-3 z-[10] cursor-pointer"
                  aria-label={
                    showConfirmPassword
                      ? "Hide password confirmation"
                      : "Show password confirmation"
                  }
                >
                  {showConfirmPassword ? (
                    <AiOutlineEyeInvisible fontSize={24} fill="#AFB2BF" />
                  ) : (
                    <AiOutlineEye fontSize={24} fill="#AFB2BF" />
                  )}
                </button>
              </label>

              <button
                type="submit"
                className="sn-btn sn-btn-primary sn-btn-lg sn-btn-block mt-6"
              >
                Reset Password
              </button>
            </form>
          ) : (
            <Link
              to="/forgot-password"
              className="sn-btn sn-btn-primary sn-btn-lg sn-btn-block mt-6"
            >
              Request a new link
            </Link>
          )}
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

export default UpdatePassword
