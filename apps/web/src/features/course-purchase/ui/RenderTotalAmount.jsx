import {
  BuyCourse,
  fetchCheckoutConfig,
} from "@/features/course-purchase/api/coursePurchaseApi"
import CheckoutPolicyAcknowledgement from "@/features/course-purchase/ui/CheckoutPolicyAcknowledgement"
import IconBtn from "@/shared/ui/IconBtn"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router"

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
    <div className="w-full min-w-0 rounded-xl border-[1px] border-border-default bg-surface-secondary p-6 lg:max-w-[340px]">
      <p className="mb-1 text-sm font-medium text-text-secondary">Total:</p>
      <p className="mb-6 text-3xl font-medium text-brand-primary">₹ {total}</p>
      <CheckoutPolicyAcknowledgement
        checked={checkoutPolicyAccepted}
        disabled={policyLoading}
        id="cart-checkout-policy"
        onChange={setCheckoutPolicyAccepted}
        policyConfig={policyConfig}
      />
      {policyLoading && (
        <p className="mt-2 text-xs text-text-secondary" role="status">
          Loading current checkout policies…
        </p>
      )}
      {policyError && (
        <div className="mt-2 text-xs text-danger" role="alert">
          <p>{policyError}</p>
          <button
            type="button"
            className="mt-1 font-medium text-brand-primary underline"
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
