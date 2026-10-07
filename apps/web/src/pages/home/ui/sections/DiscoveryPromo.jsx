import { SoftCloud } from "@/shared/ui/illustrations/Doodles"
import ProductCollage from "@/shared/ui/ProductCollage"
import { Link } from "react-router"

export default function DiscoveryPromo() {
  return (
    <section className="sn-block relative overflow-hidden">
      <SoftCloud className="absolute top-8 -left-12 hidden w-64 md:block" />
      <div className="sn-container relative">
        <div className="mx-auto grid max-w-4xl items-center gap-6 rounded-xl border border-brand-primary bg-white px-6 py-7 md:grid-cols-[1fr_15rem] md:px-10">
          <div>
            <h2 className="sn-subheading">
              Your next chapter starts
              <br />
              with a little{" "}
              <span className="text-brand-primary">curiosity.</span>
            </h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              Explore the curriculum. Find a course that fits your goals.
            </p>
            <Link to="/services" className="sn-btn sn-btn-primary mt-5">
              Discover your next course
            </Link>
          </div>
          <ProductCollage
            variant="empty"
            className="max-w-60 justify-self-center"
          />
        </div>
      </div>
    </section>
  )
}
