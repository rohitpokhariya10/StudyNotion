import ReviewSlider from "@/widgets/review-slider"

// Reviews come only from real, published learner reviews.
export default function ReviewsSection() {
  return (
    <section className="sn-block" aria-labelledby="reviews-title">
      <div className="sn-container">
        <div className="mx-auto max-w-[54rem] text-center">
          <h2 id="reviews-title" className="sn-heading">
            Why learners choose{" "}
            <span className="text-brand-primary">Prahit</span> – in their own
            words
          </h2>
          <p className="sn-copy mt-6 lg:mt-7">
            Real reviews written by Prahit learners about the courses they took.
          </p>
        </div>
        <ReviewSlider />
      </div>
    </section>
  )
}
