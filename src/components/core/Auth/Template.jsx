import { useState } from "react"
import { useSelector } from "react-redux"

import frameImg from "../../../assets/Images/frame.png"
import GoogleSignInButton from "./GoogleSignInButton"
import LoginForm from "./LoginForm"
import { emptyPolicyAcknowledgement } from "../../../utils/policyAcknowledgement"
import SignupForm from "./SignupForm"

function Template({ title, description1, description2, image, formType }) {
  const { loading } = useSelector((state) => state.auth)
  const [policyAcknowledgement, setPolicyAcknowledgement] = useState(
    emptyPolicyAcknowledgement
  )

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
      {loading ? (
        <div className="spinner"></div>
      ) : (
        <div className="mx-auto flex w-11/12 max-w-maxContent flex-col-reverse justify-between gap-y-12 py-12 md:flex-row md:gap-x-12 md:gap-y-0">
          <div className="mx-auto w-11/12 max-w-[450px] md:mx-0">
            <h1 className="text-[1.875rem] font-semibold leading-[2.375rem] text-richblack-5">
              {title}
            </h1>
            <p className="mt-4 text-[1.125rem] leading-[1.625rem]">
              <span className="text-richblack-100">{description1}</span>{" "}
              <span className="font-edu-sa font-bold italic text-blue-100">
                {description2}
              </span>
            </p>
            {formType === "signup" ? (
              <SignupForm
                policyAcknowledgement={policyAcknowledgement}
                setPolicyAcknowledgement={setPolicyAcknowledgement}
              />
            ) : (
              <LoginForm />
            )}
            <div className="my-5 flex w-full items-center gap-x-2">
              <div className="h-px flex-1 bg-richblack-700" />
              <span className="text-sm text-richblack-300">or</span>
              <div className="h-px flex-1 bg-richblack-700" />
            </div>
            <GoogleSignInButton
              requirePolicyAcknowledgement={formType === "signup"}
              policyAcknowledgement={policyAcknowledgement}
            />
            {formType === "signup" && (
              <p className="mt-3 text-center text-xs text-richblack-300">
                Google sign-up creates a Student account. Instructor onboarding
                is completed separately.
              </p>
            )}
          </div>
          <div className="relative mx-auto w-11/12 max-w-[450px] md:mx-0">
            <img
              src={frameImg}
              alt="Pattern"
              width={558}
              height={504}
              loading="lazy"
            />
            <img
              src={image}
              alt="Students"
              width={558}
              height={504}
              loading="lazy"
              className="absolute -top-4 right-4 z-10"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default Template
