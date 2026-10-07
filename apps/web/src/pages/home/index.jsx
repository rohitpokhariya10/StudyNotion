import Footer from "@/widgets/footer"
import { ContactPanel, TeachingValues } from "@/widgets/marketing"
import { useSelector } from "react-redux"

import DiscoveryPromo from "./ui/sections/DiscoveryPromo"
import ExperienceBand from "./ui/sections/ExperienceBand"
import GuidanceSection from "./ui/sections/GuidanceSection"
import HomeHero from "./ui/sections/HomeHero"
import HowItWorks from "./ui/sections/HowItWorks"
import JoinCard from "./ui/sections/JoinCard"
import ReviewsSection from "./ui/sections/ReviewsSection"
import StartBand from "./ui/sections/StartBand"
import TeachSection from "./ui/sections/TeachSection"
import WhyBand from "./ui/sections/WhyBand"

export default function Home() {
  const { isAuthenticated } = useSelector((state) => state.auth)
  return (
    <>
      <main>
        <HomeHero />
        <ExperienceBand />
        <ReviewsSection />
        <DiscoveryPromo />
        <WhyBand />
        <HowItWorks isAuthenticated={isAuthenticated} />
        <JoinCard isAuthenticated={isAuthenticated} />
        <GuidanceSection />
        <StartBand />
        <TeachSection isAuthenticated={isAuthenticated} />
        <TeachingValues />
        <ContactPanel />
      </main>
      <Footer />
    </>
  )
}
