import { MarkerUnderline } from "@/shared/ui/illustrations/Doodles"
import { FiArrowRight } from "react-icons/fi"
import { Link } from "react-router"

// Centered invitation card with a hand-drawn underline. Every statement is a
// fact about the product: accounts are free and courses are bought one by one.
export default function JoinCard({ isAuthenticated }) {
  return (
    <section className="sn-block" aria-labelledby="join-title">
      <div className="sn-container lg:py-10">
        <div className="sn-gradient-border mx-auto max-w-[56rem] rounded-xl px-6 pt-10 pb-9 text-center shadow-[0_6px_18px_rgb(16_24_40/0.06)]">
          <h2 id="join-title" className="sn-subheading">
            Your first step is free:
          </h2>
          <MarkerUnderline className="mx-auto mt-4 w-full max-w-[36rem]" />
          <p className="mt-5 text-lg leading-7 font-semibold">
            {isAuthenticated
              ? "Pick up where you left off."
              : "Create your Prahit account today!"}
          </p>
          <p className="mx-auto mt-2 max-w-[38rem] text-base leading-7">
            Browse every curriculum, read about any course and pay only for the
            ones you choose —{" "}
            <span className="text-[#c2382e]">no subscription</span>.
          </p>
          <Link
            to={isAuthenticated ? "/dashboard" : "/signup"}
            className="mt-4 inline-flex min-h-10 items-center gap-2 text-base font-medium text-brand-primary hover:underline"
          >
            {isAuthenticated ? "Go to my courses" : "Get started now"}
            <FiArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
