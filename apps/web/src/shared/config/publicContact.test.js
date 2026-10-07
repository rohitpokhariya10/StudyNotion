import { afterEach, describe, expect, it, vi } from "vitest"

async function contactFor({ email = "", entity = "", address = "" } = {}) {
  vi.stubEnv("VITE_SUPPORT_EMAIL", email)
  vi.stubEnv("VITE_LEGAL_ENTITY_NAME", entity)
  vi.stubEnv("VITE_LEGAL_ADDRESS", address)
  vi.resetModules()
  return import("./publicContact")
}

afterEach(() => vi.unstubAllEnvs())

describe("public contact identity", () => {
  it("retains configured contacts and legal identities verbatim across a product rebrand", async () => {
    const details = await contactFor({
      email: "help@example.test",
      entity: "Configured Legal Operator",
      address: "Configured office address",
    })
    expect(details.supportEmail).toBe("help@example.test")
    expect(details.legalEntity).toBe("Configured Legal Operator")
    expect(details.legalAddress).toBe("Configured office address")
  })

  it("does not present local environment placeholders as public contact details", async () => {
    const details = await contactFor({
      email: "support@studynotion.local",
      entity: "StudyNotion local container evaluation",
      address: "Local container environment",
    })
    expect(details.supportEmail).toBeNull()
    expect(details.legalEntity).toBeNull()
    expect(details.legalAddress).toBeNull()
  })

  it("does not invent contact details when none are configured", async () => {
    const details = await contactFor()
    expect(details.supportEmail).toBeNull()
    expect(details.legalEntity).toBeNull()
    expect(details.legalAddress).toBeNull()
  })
})
