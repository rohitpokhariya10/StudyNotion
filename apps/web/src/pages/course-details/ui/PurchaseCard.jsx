import { formatCatalogPrice } from "@/entities/catalog"
import { CheckoutPolicyAcknowledgement } from "@/features/course-purchase"
import CourseImage from "@/shared/ui/CourseImage"
import { FiCheckCircle, FiLock } from "react-icons/fi"

// The single enrolment card. All purchase, cart and policy behaviour comes
// from the page's existing handlers; this component only presents them.
export default function PurchaseCard({
  checkoutPolicyAccepted,
  course,
  handleAddToCart,
  handleBuyCourse,
  isEnrolled,
  onGoToCourse,
  policyConfig,
  policyError,
  policyLoading,
  reloadPolicyConfig,
  setCheckoutPolicyAccepted,
}) {
  return (
    <aside
      aria-label="Enrol in this course"
      className="sn-card sn-card-raised overflow-hidden rounded-2xl p-0"
    >
      <CourseImage
        src={course.thumbnail}
        alt={`${course.courseName} course thumbnail`}
        className="aspect-[16/10] w-full object-cover"
      />
      <div className="p-6">
        <p className="text-3xl font-semibold tracking-tight">
          {formatCatalogPrice(course.price, "INR")}
        </p>
        {isEnrolled ? (
          <>
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-success">
              <FiCheckCircle aria-hidden="true" /> You’re enrolled in this
              course
            </p>
            <button
              type="button"
              className="sn-btn sn-btn-primary sn-btn-lg sn-btn-block mt-5"
              onClick={onGoToCourse}
            >
              Go To Course
            </button>
          </>
        ) : (
          <div className="mt-5 flex flex-col gap-3">
            <CheckoutPolicyAcknowledgement
              checked={checkoutPolicyAccepted}
              disabled={policyLoading}
              id="checkout-policy"
              onChange={setCheckoutPolicyAccepted}
              policyConfig={policyConfig}
            />
            {policyLoading && (
              <p className="text-xs text-text-secondary" role="status">
                Loading current checkout policies…
              </p>
            )}
            {policyError && (
              <div className="text-xs text-danger" role="alert">
                <p>{policyError}</p>
                <button
                  type="button"
                  className="mt-1 font-medium text-brand-primary underline"
                  onClick={reloadPolicyConfig}
                >
                  Try again
                </button>
              </div>
            )}
            <button
              type="button"
              className="sn-btn sn-btn-primary sn-btn-lg sn-btn-block mt-1"
              disabled={
                !checkoutPolicyAccepted || !policyConfig || policyLoading
              }
              onClick={handleBuyCourse}
            >
              Buy Now
            </button>
            <button
              type="button"
              className="sn-btn sn-btn-secondary sn-btn-lg sn-btn-block"
              onClick={handleAddToCart}
            >
              Add to Cart
            </button>
            <p className="mt-1 flex items-center justify-center gap-2 text-center text-xs text-text-secondary">
              <FiLock aria-hidden="true" /> Secure checkout · Access after
              verified payment
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
