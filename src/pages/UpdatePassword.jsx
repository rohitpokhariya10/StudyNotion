import { useEffect, useState } from "react"
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai"
import { BiArrowBack } from "react-icons/bi"
import { useDispatch, useSelector } from "react-redux"
import { Link, useLocation, useNavigate } from "react-router-dom"

import { resetPassword } from "../services/operations/authAPI"

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
    <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
      {loading ? (
        <div className="spinner"></div>
      ) : (
        <div className="max-w-[500px] p-4 lg:p-8">
          <h1 className="text-[1.875rem] font-semibold leading-[2.375rem] text-richblack-5">
            Choose new password
          </h1>
          <p className="my-4 text-[1.125rem] leading-[1.625rem] text-richblack-100">
            {resetToken
              ? "Almost done. Enter your new password and you're all set."
              : "This password reset link is invalid or incomplete. Request a new link to continue."}
          </p>
          {resetToken ? (
            <form onSubmit={handleOnSubmit}>
              <label className="relative">
                <p className="mb-1 text-[0.875rem] leading-[1.375rem] text-richblack-5">
                  New Password <sup className="text-pink-200">*</sup>
                </p>
                <input
                  required
                  maxLength={72}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={password}
                  onChange={handleOnChange}
                  placeholder="Enter Password"
                  className="form-style w-full !pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-[38px] z-[10] cursor-pointer"
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
                <p className="mb-1 text-[0.875rem] leading-[1.375rem] text-richblack-5">
                  Confirm New Password <sup className="text-pink-200">*</sup>
                </p>
                <input
                  required
                  maxLength={72}
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={handleOnChange}
                  placeholder="Confirm Password"
                  className="form-style w-full !pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-[38px] z-[10] cursor-pointer"
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
                className="mt-6 w-full rounded-[8px] bg-yellow-50 px-[12px] py-[12px] font-medium text-richblack-900"
              >
                Reset Password
              </button>
            </form>
          ) : (
            <Link
              to="/forgot-password"
              className="mt-6 block w-full rounded-[8px] bg-yellow-50 px-[12px] py-[12px] text-center font-medium text-richblack-900"
            >
              Request a new link
            </Link>
          )}
          <div className="mt-6 flex items-center justify-between">
            <Link to="/login">
              <p className="flex items-center gap-x-2 text-richblack-5">
                <BiArrowBack /> Back To Login
              </p>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default UpdatePassword
