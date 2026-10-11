// Only routes that are implemented in the router belong here, so the footer
// never sends learners to placeholder 404s. The contact page is linked from
// the footer's contact column.
export const FooterLink2 = [
  {
    title: "Website",
    links: [
      { title: "Home", link: "/" },
      { title: "About Us", link: "/about" },
      { title: "Services", link: "/services" },
      { title: "Careers", link: "/careers" },
      { title: "Blogs", link: "/blogs" },
      { title: "NEET Mocks", link: "/neet" },
    ],
  },
  {
    title: "Company",
    links: [
      { title: "Privacy Policy", link: "/privacy-policy" },
      { title: "Terms of Use", link: "/terms" },
      { title: "Refunds & Cancellations", link: "/refund-policy" },
      { title: "Cookie Policy", link: "/cookie-policy" },
    ],
  },
]
