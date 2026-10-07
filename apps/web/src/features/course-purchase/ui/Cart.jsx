import RenderCartCourses from "@/features/course-purchase/ui/RenderCartCourses"
import RenderTotalAmount from "@/features/course-purchase/ui/RenderTotalAmount"
import FlaskLoader from "@/shared/ui/FlaskLoader"
import PageIntro from "@/shared/ui/PageIntro"
import ProductCollage from "@/shared/ui/ProductCollage"
import { useSelector } from "react-redux"
import { Link } from "react-router"

export default function Cart() {
  const { total, totalItems } = useSelector((state) => state.cart)
  const { paymentLoading } = useSelector((state) => state.course)

  if (paymentLoading)
    return (
      <div className="grid min-h-[70vh] place-items-center" aria-busy="true">
        <FlaskLoader label="Processing checkout" />
      </div>
    )

  return (
    <>
      <PageIntro
        eyebrow="Your next chapter"
        title="Cart"
        description="Review your courses before you begin."
      />
      <p className="border-b border-b-border-default pb-2 font-semibold text-text-secondary">
        {totalItems} Courses in Cart
      </p>
      {total > 0 ? (
        <div className="mt-8 flex flex-col items-start gap-x-10 gap-y-6 lg:flex-row">
          <RenderCartCourses />
          <RenderTotalAmount />
        </div>
      ) : (
        <div className="sn-card mt-8 text-center">
          <ProductCollage variant="empty" className="mx-auto max-w-xs" />
          <h2 className="text-2xl font-bold">Your cart is empty</h2>
          <Link to="/services" className="sn-btn sn-btn-primary mt-5">
            Explore Courses
          </Link>
        </div>
      )}
    </>
  )
}
