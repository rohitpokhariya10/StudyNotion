import { describe, expect, it } from "vitest"

import { getAvatarSource, getInitialsAvatar } from "./avatar"

describe("local initials avatars", () => {
  it("creates a deterministic inline SVG without embedding the full identity", () => {
    const first = getInitialsAvatar({
      firstName: "Rohit",
      lastName: "Pokhariya",
      email: "private@example.com",
    })
    const second = getInitialsAvatar("Rohit Pokhariya")
    const decoded = decodeURIComponent(first)

    expect(first).toBe(second)
    expect(first).toMatch(/^data:image\/svg\+xml;charset=UTF-8,/)
    expect(decoded).toContain(">RP</text>")
    expect(decoded).not.toContain("Rohit")
    expect(decoded).not.toContain("private@example.com")
    expect(decoded).not.toContain("http://api.dicebear.com")
    expect(decoded).not.toContain("https://api.dicebear.com")
  })

  it("supports a mononymous learner", () => {
    expect(decodeURIComponent(getInitialsAvatar("Aarav"))).toContain(
      ">AA</text>"
    )
  })

  it("replaces legacy external DiceBear profile URLs locally", () => {
    expect(
      getAvatarSource({
        firstName: "Private",
        image: "https://api.dicebear.com/9.x/initials/svg?seed=Private",
      })
    ).toMatch(/^data:image\/svg\+xml/)
  })
})
