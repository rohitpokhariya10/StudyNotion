import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import SafeMarkdown from "./SafeMarkdown"

describe("SafeMarkdown", () => {
  it("does not render instructor-controlled remote images or unsafe links", () => {
    const { container } = render(
      <SafeMarkdown>
        {"![tracker](https://tracker.example/pixel.gif) [safe](https://docs.example/lesson) [unsafe](javascript:alert(1))"}
      </SafeMarkdown>
    )

    expect(container.querySelector("img")).toBeNull()
    expect(screen.getByRole("link", { name: "safe" })).toHaveAttribute(
      "href",
      "https://docs.example/lesson"
    )
    expect(screen.queryByRole("link", { name: "unsafe" })).toBeNull()
  })
})
