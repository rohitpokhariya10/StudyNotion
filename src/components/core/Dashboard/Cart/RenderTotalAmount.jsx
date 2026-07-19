import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import {
  BuyCourse,
  fetchCheckoutConfig,
} from "../../../../services/operations/studentFeaturesAPI"
import CheckoutPolicyAcknowledgement from "../../../Common/CheckoutPolicyAcknowledgement"
import IconBtn from "../../../Common/IconBtn"

export default function RenderTotalAmount() {
  const { total, cart } = useSelector((state) => state.cart)
  const { token } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.profile)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [checkoutPolicyAccepted, setCheckoutPolicyAccepted] = useState(false)
  const [policyConfig, setPolicyConfig] = useState(null)
  const [policyError, setPolicyError] = useState("")
  const [policyLoading, setPolicyLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    fetchCheckoutConfig()
      .then((config) => {
        if (active) setPolicyConfig(config)
      })
      .catch((error) => {
        if (!active) return
        setPolicyConfig(null)
        setPolicyError(error.message)
      })
      .finally(() => {
        if (active) setPolicyLoading(false)
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  const handleBuyCourse = () => {
    const courses = cart.map((course) => course._id)
    BuyCourse(token, courses, user, navigate, dispatch, {
      ...policyConfig,
      acknowledged: checkoutPolicyAccepted,
    })
  }

  return (
    <div className="min-w-[280px] rounded-md border-[1px] border-richblack-700 bg-richblack-800 p-6">
      <p className="mb-1 text-sm font-medium text-richblack-300">Total:</p>
      <p className="mb-6 text-3xl font-medium text-yellow-100">₹ {total}</p>
      <CheckoutPolicyAcknowledgement
        checked={checkoutPolicyAccepted}
        disabled={policyLoading}
        id="cart-checkout-policy"
        onChange={setCheckoutPolicyAccepted}
        policyConfig={policyConfig}
      />
      {policyLoading && (
        <p className="mt-2 text-xs text-richblack-300" role="status">
          Loading current checkout policies…
        </p>
      )}
      {policyError && (
        <div className="mt-2 text-xs text-pink-100" role="alert">
          <p>{policyError}</p>
          <button
            type="button"
            className="mt-1 font-medium text-yellow-100 underline"
            onClick={() => {
              setPolicyLoading(true)
              setPolicyError("")
              setPolicyConfig(null)
              setCheckoutPolicyAccepted(false)
              setReloadKey((current) => current + 1)
            }}
          >
            Try again
          </button>
        </div>
      )}
      <IconBtn
        text="Buy Now"
        onclick={handleBuyCourse}
        customClasses="w-full justify-center"
        disabled={!checkoutPolicyAccepted || !policyConfig || policyLoading}
      />
    </div>
  )
}
