import React from "react"
import { FooterLink2 } from "../../data/footer-links"
import { Link } from "react-router-dom"

// Images
import Logo from "../../assets/Logo/Logo-Full-Light.png"

// Icons
import { FaFacebookF, FaGoogle, FaTwitter, FaYoutube } from "react-icons/fa"

const BottomFooter = ["Privacy Policy", "Cookie Policy", "Terms"]
const Resources = [
  "Articles",
  "Blog",
  "Chart Sheet",
  "Code challenges",
  "Docs",
  "Projects",
  "Videos",
  "Workspaces",
]
const Plans = ["Paid memberships", "For students", "Business solutions"]
const Community = ["Forums", "Chapters", "Events"]

const Footer = () => {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-richblack-800 text-richblack-400">
      {/* Top area */}
      <div className="mx-auto w-11/12 max-w-maxContent py-14">
        <div className="grid gap-10 lg:grid-cols-4">
          {/* About */}
          <div className="flex flex-col gap-4">
            <img src={Logo} alt="Studynotion logo" className="w-[160px] object-contain" />
            <p className="text-sm text-richblack-300 max-w-[320px]">
              Studynotion — interactive, practical and industry-led online courses that
              help learners launch and level-up careers. Learn at your pace with expert
              instructors and community support.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <a
                href="#facebook"
                aria-label="Studynotion on Facebook"
                className="text-lg hover:text-richblack-50 transition-colors"
                rel="noopener noreferrer"
              >
                <FaFacebookF />
              </a>
              <a
                href="#google"
                aria-label="Studynotion on Google"
                className="text-lg hover:text-richblack-50 transition-colors"
                rel="noopener noreferrer"
              >
                <FaGoogle />
              </a>
              <a
                href="#twitter"
                aria-label="Studynotion on Twitter"
                className="text-lg hover:text-richblack-50 transition-colors"
                rel="noopener noreferrer"
              >
                <FaTwitter />
              </a>
              <a
                href="#youtube"
                aria-label="Studynotion on YouTube"
                className="text-lg hover:text-richblack-50 transition-colors"
                rel="noopener noreferrer"
              >
                <FaYoutube />
              </a>
            </div>
          </div>

          {/* Quick links (from FooterLink2) */}
          <div className="grid grid-cols-2 gap-6 lg:col-span-2">
            {FooterLink2.map((section, idx) => (
              <div key={idx}>
                <h3 className="mb-3 text-richblack-50 text-[16px] font-semibold">{section.title}</h3>
                <ul className="flex flex-col gap-2">
                  {section.links.map((link, i) => (
                    <li key={i} className="text-[14px]">
                      {/* if link is external (starts with http) use anchor, else Link */}
                      {/^https?:\/\//.test(link.link) ? (
                        <a
                          href={link.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-richblack-50 transition-colors"
                        >
                          {link.title}
                        </a>
                      ) : (
                        <Link to={link.link} className="hover:text-richblack-50 transition-colors">
                          {link.title}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Resources & Contact */}
          <div className="flex flex-col gap-4">
            <h3 className="text-richblack-50 text-[16px] font-semibold">Explore</h3>
            <div className="grid grid-cols-2 gap-3 text-[14px]">
              <div>
                <h4 className="font-medium text-richblack-50 mb-2">Resources</h4>
                <ul className="flex flex-col gap-2">
                  {Resources.slice(0, 4).map((r, i) => (
                    <li key={i}>
                      <Link to={`/${r.split(" ").join("-").toLowerCase()}`} className="hover:text-richblack-50 transition-colors">
                        {r}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-richblack-50 mb-2">More</h4>
                <ul className="flex flex-col gap-2">
                  {Resources.slice(4).map((r, i) => (
                    <li key={i}>
                      <Link to={`/${r.split(" ").join("-").toLowerCase()}`} className="hover:text-richblack-50 transition-colors">
                        {r}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-medium text-richblack-50 mb-2">Contact</h4>
              <div className="text-sm text-richblack-300 flex flex-col gap-2">
                <a href="mailto:contact@studynotion.com" className="hover:text-richblack-50 transition-colors">rohit.pokhariya123@gmail.com</a>
                <a href="tel:+911234567890" className="hover:text-richblack-50 transition-colors">+91 9012464329</a>
                <p className="text-[13px] text-richblack-400 mt-2">Support: Mon — Fri, 9:00 — 18:00 IST</p>
              </div>
            </div>

            <div className="mt-auto">
              <h4 className="font-medium text-richblack-50 mb-2">Plans & Community</h4>
              <div className="flex flex-wrap gap-2 text-[13px] text-richblack-300">
                {Plans.map((p, i) => (
                  <Link key={i} to={`/${p.split(" ").join("-").toLowerCase()}`} className="px-2 py-1 rounded bg-richblack-700 hover:bg-richblack-600 transition-colors">
                    {p}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom area */}
      <div className="border-t border-richblack-700">
        <div className="mx-auto w-11/12 max-w-maxContent py-6 flex flex-col gap-4 lg:flex-row items-center justify-between text-sm text-richblack-400">
          <div className="flex items-center gap-4 flex-wrap">
            {BottomFooter.map((item, idx) => (
              <Link
                key={idx}
                to={`/${item.split(" ").join("-").toLowerCase()}`}
                className="px-2 py-1 hover:text-richblack-50 transition-colors border-r border-transparent last:border-0"
              >
                {item}
              </Link>
            ))}
          </div>

          <div className="text-center text-richblack-300">
            <span className="block">Made with <span aria-hidden="true">❤️</span> by Rohit Pokhariya</span>
            <span className="block">© {year} Studynotion. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
