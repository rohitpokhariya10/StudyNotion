import { legalAddress, supportEmail } from "@/shared/config/publicContact"
import BrandLogo from "@/shared/ui/BrandLogo"
import { FooterLink2 } from "@/widgets/footer/model/links"
import FooterLandscape from "@/widgets/footer/ui/FooterLandscape"
import FooterSignup from "@/widgets/footer/ui/FooterSignup"
import { FiMail, FiMapPin, FiMessageCircle } from "react-icons/fi"
import { Link } from "react-router"

import "./footer.css"

// Contact details come only from deployment configuration; anything that is
// not configured (phone, social profiles) is left out rather than invented.
export default function Footer() {
  return (
    <footer className="sn-footer">
      <FooterLandscape />
      <div className="sn-footer-inner">
        <FooterSignup />
        <hr className="sn-footer-divider" />
        <div className="sn-footer-grid">
          <div className="sn-footer-identity">
            <Link to="/" aria-label="Prahit home" className="sn-footer-brand">
              <BrandLogo size="footer" decorative />
            </Link>
            <p className="sn-footer-tagline">
              Practical, instructor-led courses that help learners build lasting
              skills at their own pace.
            </p>
            <p className="sn-footer-copyright">
              © {new Date().getFullYear()} Prahit. All rights reserved.
            </p>
          </div>
          {FooterLink2.map((section) => (
            <nav
              key={section.title}
              aria-label={`${section.title} links`}
              className="sn-footer-column"
            >
              <h2 className="sn-footer-heading">{section.title}</h2>
              <ul className="sn-footer-links">
                {section.links.map((link) => (
                  <li key={link.title}>
                    <Link to={link.link} className="sn-footer-link">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="sn-footer-column sn-footer-contact-column">
            <h2 className="sn-footer-heading">Contact us</h2>
            <ul className="sn-footer-contact">
              {legalAddress && (
                <li>
                  <FiMapPin aria-hidden="true" className="sn-footer-icon" />
                  <span>{legalAddress}</span>
                </li>
              )}
              {supportEmail && (
                <li>
                  <FiMail aria-hidden="true" className="sn-footer-icon" />
                  <a href={`mailto:${supportEmail}`} className="sn-footer-link">
                    {supportEmail}
                  </a>
                </li>
              )}
              <li>
                <FiMessageCircle
                  aria-hidden="true"
                  className="sn-footer-icon"
                />
                <Link to="/contact" className="sn-footer-link">
                  Send us a message
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}
