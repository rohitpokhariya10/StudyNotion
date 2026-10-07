import HighlightText from "@/shared/ui/HighlightText"

const Quote = () => {
  return (
    <div className="mx-auto py-5 pb-20 text-center text-xl font-semibold text-text-primary md:text-4xl">
      We are passionate about revolutionizing the way we learn. Our innovative
      platform <HighlightText text={"combines technology"} />,{" "}
      <span className="font-bold text-brand-primary"> expertise</span>, and
      community to create an
      <span className="font-bold text-brand-primary">
        {" "}
        unparalleled educational experience.
      </span>
    </div>
  )
}

export default Quote
