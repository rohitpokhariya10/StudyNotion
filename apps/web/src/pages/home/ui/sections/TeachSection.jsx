import { Squiggle } from "@/shared/ui/illustrations/Doodles"
import PersonFigure from "@/shared/ui/illustrations/PersonFigure"
import { FiCheck, FiLayers } from "react-icons/fi"
import { Link } from "react-router"

// Framed instructor illustration with two floating product chips.
function InstructorArt() {
  return (
    <div className="relative mx-auto w-full max-w-[25rem] lg:mx-0">
      <span
        aria-hidden="true"
        className="absolute -top-6 right-0 h-6 w-6 rounded-full bg-sun"
      />
      <div className="relative ml-auto aspect-[364/470] w-[82%] overflow-hidden rounded-sm bg-linear-to-b from-[#dbe8fb] to-[#f3f7fd]">
        <div
          aria-hidden="true"
          className="absolute top-[12%] left-[10%] h-[30%] w-[48%] rounded-md border-4 border-white bg-[#c6d9f6]"
        >
          <span className="absolute bottom-[18%] left-[14%] h-[38%] w-[10%] rounded-sm bg-brand-primary/70" />
          <span className="absolute bottom-[18%] left-[34%] h-[58%] w-[10%] rounded-sm bg-brand-primary/70" />
          <span className="absolute bottom-[18%] left-[54%] h-[46%] w-[10%] rounded-sm bg-brand-primary/70" />
          <span className="absolute bottom-[18%] left-[74%] h-[70%] w-[10%] rounded-sm bg-brand-primary" />
        </div>
        <PersonFigure
          variant="teacher"
          className="absolute -bottom-px left-1/2 h-[82%] w-auto -translate-x-1/2"
        />
      </div>
      <div className="absolute top-[6%] left-0 w-[36%] rounded-sm border border-[#e5e9f0] bg-white px-3 py-4 text-center shadow-[0_6px_18px_rgb(16_24_40/0.1)]">
        <span className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-brand-primary">
          <FiLayers aria-hidden="true" size={14} />
        </span>
        <span className="mt-2.5 block text-xs font-semibold">
          Course builder
        </span>
        <span className="block text-[0.6875rem] text-text-secondary">
          Sections · lessons
        </span>
        <span className="mt-3 block border-t border-[#eef1f5] pt-2 text-sm font-semibold text-[#17865f]">
          <FiCheck aria-hidden="true" className="mr-1 inline" />
          Published
        </span>
      </div>
      <div className="absolute right-[-3%] bottom-[-2%] flex items-center gap-2 rounded-sm border border-[#e5e9f0] bg-white px-3 py-2.5 shadow-[0_6px_18px_rgb(16_24_40/0.1)]">
        <span aria-hidden="true" className="flex -space-x-2">
          {["#f0645a", "#ffd23f", "#17a589", "#1a66cc"].map((color) => (
            <span
              key={color}
              className="h-6 w-6 rounded-full border-2 border-white"
              style={{ background: color }}
            />
          ))}
        </span>
        <span className="text-[0.6875rem] leading-tight font-medium">
          Approved
          <br />
          instructors
        </span>
      </div>
      <Squiggle className="absolute right-[-6%] -bottom-16 hidden h-10 w-10 lg:block" />
    </div>
  )
}

// White split section inviting instructors, with the illustration on the right.
export default function TeachSection({ isAuthenticated }) {
  return (
    <section className="sn-block" aria-labelledby="teach-title">
      <div className="sn-container grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-20">
        <div className="text-center lg:order-first lg:text-left">
          <h2 id="teach-title" className="sn-heading">
            Share your <span className="text-brand-primary">knowledge</span>.
            <br />
            Shape someone’s <span className="text-brand-primary">future</span>.
          </h2>
          <p className="mt-8 text-base leading-6 lg:max-w-[35rem]">
            Build a structured course with sections and video lessons. Approved
            instructors publish to the Prahit catalog and manage their courses
            from their own dashboard.
          </p>
          <p className="mt-3 text-sm text-text-secondary">
            Choose Instructor when you sign up. Instructor accounts require
            approval.
          </p>
          <Link
            to={isAuthenticated ? "/dashboard" : "/signup"}
            className="sn-btn sn-btn-primary mt-6 w-full sm:w-80"
          >
            {isAuthenticated ? "Open your dashboard" : "Become an instructor"}
          </Link>
        </div>
        <div className="order-first lg:order-none">
          <InstructorArt />
        </div>
      </div>
    </section>
  )
}
