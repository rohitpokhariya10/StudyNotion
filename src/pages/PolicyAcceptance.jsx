import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import PolicyAcknowledgement from "../components/core/Auth/PolicyAcknowledgement"
import { acceptCurrentPolicies } from "../services/operations/authAPI"
import { emptyPolicyAcknowledgement } from "../utils/policyAcknowledgement"

export default function PolicyAcceptance() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading } = useSelector((state) => state.auth)
  const [acknowledgement, setAcknowledgement] = useState(
    emptyPolicyAcknowledgement
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    dispatch(acceptCurrentPolicies(acknowledgement, navigate))
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-3.5rem)] w-11/12 max-w-xl place-items-center py-12 text-richblack-5">
      <form
        className="w-full rounded-xl border border-richblack-600 bg-richblack-800 p-6 sm:p-8"
        onSubmit={handleSubmit}
      >
        <h1 className="text-3xl font-semibold">Review the current policies</h1>
        <p className="mb-6 mt-3 leading-6 text-richblack-200">
          We updated the account agreement. Your learning data remains available,
          but you need to review these items before using authenticated features.
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
