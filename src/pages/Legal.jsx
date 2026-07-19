import { useEffect, useState } from "react"

import Footer from "../components/Common/Footer"
import { fetchCheckoutConfig } from "../services/operations/studentFeaturesAPI"

const supportEmail =
  import.meta.env.VITE_SUPPORT_EMAIL || "support@studynotion.local"
const legalEntity =
  import.meta.env.VITE_LEGAL_ENTITY_NAME || "StudyNotion (local development)"
const legalAddress = import.meta.env.VITE_LEGAL_ADDRESS || "Not configured"
const legalJurisdiction =
  import.meta.env.VITE_LEGAL_JURISDICTION || "India"
const effectiveDate = "18 July 2026"

const documents = {
  privacy: {
    title: "Privacy Policy",
    intro:
      "This policy explains what StudyNotion processes when you use the learning platform, why it is needed, and the choices available to you.",
    sections: [
      {
        heading: "Information we process",
        paragraphs: [
          "Account data includes your name, email address, account role, encrypted password credentials, and—when you choose Google sign-in—the verified Google account identifier and profile information Google provides.",
          "Learning data includes enrollments, lesson progress, reviews, course content, and instructor uploads. Optional profile fields can include a phone number, date of birth, gender, profile image, and biography.",
          "Transaction records include course, amount, currency, order, payment, and fulfillment identifiers. Razorpay processes payment-instrument details; StudyNotion does not store full card or bank credentials.",
          "Support and security data includes contact-form messages, request identifiers, and hashed rate-limit identifiers used to prevent abuse. Infrastructure providers may retain limited network logs under their own retention settings.",
        ],
      },
      {
        heading: "How information is used",
        paragraphs: [
          "We use this information to authenticate accounts, deliver purchased learning content, record progress, review instructors, process and reconcile payments, send transactional messages, answer support requests, secure the service, and comply with legal obligations.",
          "StudyNotion does not sell personal information or use it for third-party behavioural advertising in this release.",
        ],
      },
      {
        heading: "Service providers and international processing",
        paragraphs: [
          "The platform relies on hosting and database infrastructure, Resend for transactional email, Google for optional sign-in, Razorpay for payments, and Cloudinary for images and protected lesson media. Those providers process data under their own terms and may operate in other countries.",
        ],
      },
      {
        heading: "Retention, deletion, and your choices",
        paragraphs: [
          "We retain account and learning data while the account is active. Account deletion removes or anonymizes profile and learning data, while transaction, fraud-prevention, audit, or legal records may be retained for the period required by law. Backups expire according to the infrastructure retention schedule.",
          "You may update optional profile data in Settings, avoid Google sign-in, and request access, correction, deletion, or another applicable privacy right by contacting support. We may verify the request before acting on it.",
        ],
      },
      {
        heading: "Children and changes",
        paragraphs: [
          "The public service is not intended for children who cannot lawfully consent to online services in their location. A parent, guardian, or educational institution must provide any consent required by law before a minor uses the service.",
          "We may update this policy as the product or law changes. Material changes will be posted here with a revised effective date.",
        ],
      },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    intro:
      "StudyNotion currently uses cookies and similar browser storage only where needed to operate authentication and provider-initiated features.",
    sections: [
      {
        heading: "Essential session cookie",
        paragraphs: [
          "After sign-in, the API sets an HttpOnly, Secure production session cookie. JavaScript cannot read it. It is used to keep you signed in, apply role and enrollment permissions, prevent cross-site misuse, and end sessions after logout, password change, or security revocation.",
          "Disabling this cookie prevents authenticated dashboard, course, and account features from working. It is not used for advertising.",
        ],
      },
      {
        heading: "Google and Razorpay",
        paragraphs: [
          "Google Identity Services and Razorpay may use their own cookies or local browser storage when you actively open sign-in or checkout. Their use is governed by their respective privacy and cookie policies. StudyNotion does not load an advertising or analytics cookie SDK in this release.",
        ],
      },
      {
        heading: "Browser controls and updates",
        paragraphs: [
          "You can clear cookies through your browser, but doing so signs you out and can interrupt checkout. If optional analytics or marketing cookies are introduced later, this policy and an appropriate consent control must be updated before they are enabled.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Use",
    intro:
      "These terms govern access to StudyNotion. By creating an account or purchasing a course, you agree to them and to the policies linked from this page.",
    sections: [
      {
        heading: "Accounts and acceptable use",
        paragraphs: [
          "Provide accurate information, protect your sign-in credentials, and use only your own account. You must not probe, scrape, overload, bypass access controls, share paid-course access, upload unlawful material, infringe another person's rights, or misuse learner information.",
          "Instructor accounts require approval. We may reject, suspend, or deactivate accounts and content when needed for security, legal compliance, learner protection, or a material breach of these terms.",
        ],
      },
      {
        heading: "Courses, purchases, and refunds",
        paragraphs: [
          "Course descriptions, prices, and availability can change before purchase. Razorpay processes payment and the platform grants access only after server-side payment verification. Do not close or manipulate checkout while payment is being confirmed.",
          "Refunds are provided only where required by applicable law or under a refund policy explicitly shown at the time of purchase. Contact support with the order and payment identifiers; never send full card or bank credentials.",
        ],
      },
      {
        heading: "Content and intellectual property",
        paragraphs: [
          "StudyNotion and its licensors retain rights in the platform. A paid enrollment gives the learner a limited, personal, non-transferable right to view the available course content through the service.",
          "Instructors keep ownership of content they are entitled to upload and grant StudyNotion the rights needed to host, secure, display, and deliver it. Instructors are responsible for permissions, accuracy, and lawful use of all uploaded material.",
        ],
      },
      {
        heading: "Service expectations and liability",
        paragraphs: [
          "We work to keep the platform available and secure, but maintenance, provider failures, and events outside reasonable control can cause interruptions. Courses are educational content and do not guarantee employment, certification, income, or a particular outcome.",
          "Nothing in these terms excludes a right or liability that cannot legally be excluded. Otherwise, liability is limited to the extent permitted by applicable law.",
        ],
      },
      {
        heading: "Changes and governing law",
        paragraphs: [
          `We may update these terms for product, security, or legal changes and will post the revised effective date. The laws of ${legalJurisdiction} govern unless mandatory consumer law requires otherwise.`,
        ],
      },
    ],
  },
  refunds: {
    title: "Refund & Cancellation Policy",
    intro:
      "This policy explains how to cancel an unpaid checkout and how StudyNotion handles refund requests after a verified course purchase.",
    sections: [
      {
        heading: "Before payment",
        paragraphs: [
          "You may close or cancel Razorpay Checkout before completing payment. A course is not purchased and access is not granted until StudyNotion verifies the provider payment on the server.",
        ],
      },
      {
        heading: "Requesting a refund",
        paragraphs: [
          ({ refundWindowDays }) =>
            refundWindowDays === null
              ? "The applicable refund window is displayed and recorded during checkout. Contact support with the account email, order ID, course, and reason. Do not send full card, bank, OTP, or UPI credentials. Submitting a request does not itself confirm eligibility."
              : `Contact support within ${refundWindowDays} calendar days of the verified purchase with the account email, order ID, course, and reason. Do not send full card, bank, OTP, or UPI credentials. Submitting a request does not itself confirm eligibility.`,
          "We assess delivery failures, duplicate charges, material differences from the course description, learning-content use, fraud indicators, and rights that cannot be limited under applicable law. Approved refunds are returned through Razorpay to the original payment method; provider and bank processing times may vary.",
        ],
      },
      {
        heading: "Late or unresolved payments",
        paragraphs: [
          "A payment captured after checkout expiry, with a changed price, unavailable course, or failed fulfillment is held for operator review rather than silently enrolling the learner. Support will reconcile access or initiate a refund after validating the provider record.",
        ],
      },
      {
        heading: "Course cancellation and access",
        paragraphs: [
          "Archived courses remain available to existing enrolled learners where delivery remains possible. If StudyNotion cannot provide purchased access, we will offer an appropriate remedy or refund as required by this policy and applicable law.",
        ],
      },
    ],
  },
}

export default function Legal({ document }) {
  const content = documents[document] || documents.privacy
  const [refundWindowDays, setRefundWindowDays] = useState(null)

  useEffect(() => {
    if (document !== "refunds") return undefined
    let active = true
    fetchCheckoutConfig()
      .then((config) => {
        if (active) setRefundWindowDays(config.refundWindowDays)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [document])

  return (
    <>
      <main className="mx-auto w-11/12 max-w-4xl flex-1 py-16 text-richblack-100">
        <header className="border-b border-richblack-700 pb-8">
          <h1 className="text-4xl font-semibold text-richblack-5">
            {content.title}
          </h1>
          <p className="mt-3 text-sm text-richblack-300">
            Effective date: {effectiveDate}
          </p>
          <p className="mt-6 text-base leading-7">{content.intro}</p>
        </header>

        <div className="space-y-10 py-10">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-semibold text-richblack-25">
                {section.heading}
              </h2>
              <div className="mt-4 space-y-4 leading-7">
                {section.paragraphs.map((paragraph) => {
                  const text =
                    typeof paragraph === "function"
                      ? paragraph({ refundWindowDays })
                      : paragraph
                  return <p key={text}>{text}</p>
                })}
              </div>
            </section>
          ))}

          <section>
            <h2 className="text-2xl font-semibold text-richblack-25">
              Contact
            </h2>
            <p className="mt-4 leading-7">
              StudyNotion is operated by {legalEntity}, {legalAddress}. Questions
              or rights requests can be sent to{" "}
              <a
                className="text-yellow-100 underline-offset-4 hover:underline"
                href={`mailto:${supportEmail}`}
              >
                {supportEmail}
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
