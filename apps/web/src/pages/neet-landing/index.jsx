import { neetClient, useNeetResource } from "@/entities/neet"
import Footer from "@/widgets/footer"
import { NEET_LEGAL_NOTICE, ProjectNeetShell } from "@/widgets/neet-shell"

import { LandingHero } from "./ui/LandingHero"
import { OpenPapers } from "./ui/OpenPapers"
import { PreparationSection } from "./ui/PreparationSection"

import "./neetLanding.css"

export default function NeetLanding() {
  const catalog = useNeetResource(neetClient.listTests, [])
  const firstOpen =
    catalog.status === "success" &&
    catalog.data.tests.find((test) => test.availability.state === "OPEN")
  // Start a Mock enters the first open paper's onboarding (sign-in, details,
  // mode, instructions, checks). Without an open paper it opens the catalog.
  const startPath = firstOpen
    ? `/neet/mocks/${firstOpen.id}/start`
    : "/neet/mocks"
  return (
    <ProjectNeetShell landing footer={<Footer note={NEET_LEGAL_NOTICE} />}>
      <title>Prahit NEET Mocks | Focused practice, clearer progress</title>
      <LandingHero startPath={startPath} />
      <OpenPapers catalog={catalog} />
      <PreparationSection startPath={startPath} />
    </ProjectNeetShell>
  )
}
