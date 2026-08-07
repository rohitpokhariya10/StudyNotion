import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useLocation, useNavigate } from "react-router"

import PolicyAcknowledgement from "../components/core/Auth/PolicyAcknowledgement"
import { acceptCurrentPolicies } from "../services/operations/authAPI"
import { sanitizeInternalRedirect } from "../utils/internalRedirect"
import { emptyPolicyAcknowledgement } from "../utils/policyAcknowledgement"

export default function PolicyAcceptance() {
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const { loading } = useSelector((state) => state.auth)
  const [acknowledgement, setAcknowledgement] = useState(
    emptyPolicyAcknowledgement
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    const postAcceptancePath = sanitizeInternalRedirect(location.state?.from)
    dispatch(
      acceptCurrentPolicies(acknowledgement, navigate, postAcceptancePath)
    )
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-3.5rem)] w-11/12 max-w-xl place-items-center py-12 text-richblack-5">
      <form
        className="w-full rounded-xl border border-richblack-600 bg-richblack-800 p-6 sm:p-8"
        onSubmit={handleSubmit}
      >
        <h1 className="text-3xl font-semibold">Review the current policies</h1>
        <p className="mt-3 mb-6 leading-6 text-richblack-200">
          We updated the account agreement. Your learning data remains
          available, but you need to review these items before using
          authenticated features.
        </p>
        <PolicyAcknowledgement
          idPrefix="existing-account-policy"
          value={acknowledgement}
          onChange={setAcknowledgement}
        />
        <button
          type="submit"
          disabled={loading}
          className="yellowButton mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Saving..." : "Accept and continue"}
        </button>
      </form>
    </main>
  )
}
