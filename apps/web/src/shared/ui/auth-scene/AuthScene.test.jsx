import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import AuthScene from "./AuthScene"
import { usePrivateField } from "./privacy"

function PasswordFixture() {
  const [shown, setShown] = useState(false)
  const privacy = usePrivateField(shown)
  return (
    <>
      <label htmlFor="email">Email</label>
      <input id="email" />
      <label htmlFor="password">Password</label>
      <input id="password" type={shown ? "text" : "password"} {...privacy} />
      <button type="button" onClick={() => setShown((value) => !value)}>
        {shown ? "Hide" : "Show"}
      </button>
    </>
  )
}

const eyes = (container) =>
  container.querySelector(".sn-yeti").getAttribute("data-eyes")

describe("AuthScene", () => {
  afterEach(() => vi.useRealTimers())

  it("renders the decorative 3D mascot, tagline and form content", async () => {
    const { container } = render(
      <AuthScene>
        <h1>Welcome back</h1>
      </AuthScene>
    )
    expect(
      screen.getByRole("heading", { name: "Welcome back" })
    ).toBeInTheDocument()
    const mascot = container.querySelector(".sn-yeti.sn-auth-mascot")
    expect(mascot).toHaveAttribute("aria-hidden", "true")
    expect(mascot.querySelector("img")).toHaveAttribute("alt", "")
    // Without WebGL (jsdom) the rest-pose poster stays; the form is unaffected.
    await waitFor(() => expect(mascot).toHaveAttribute("data-state", "static"))
    expect(mascot.querySelector("canvas")).toBeNull()
    expect(container.querySelector(".sn-auth-tagline")).toHaveAttribute(
      "aria-hidden",
      "true"
    )
  })

  it("marks the form type so the sign-up form can use its compact rhythm", () => {
    const { container, rerender } = render(
      <AuthScene form="signup">
        <h1>Create your account</h1>
      </AuthScene>
    )
    expect(container.querySelector(".sn-auth-scene")).toHaveAttribute(
      "data-form",
      "signup"
    )
    // The hill and stage share the camera framing's aspect.
    expect(
      container
        .querySelector(".sn-auth-visual")
        .style.getPropertyValue("--yeti-aspect")
    ).toBe("1.27")
    expect(container.querySelector(".sn-auth-ground")).toHaveAttribute(
      "aria-hidden",
      "true"
    )
    rerender(
      <AuthScene form="login">
        <h1>Welcome back</h1>
      </AuthScene>
    )
    expect(container.querySelector(".sn-auth-scene")).toHaveAttribute(
      "data-form",
      "login"
    )
  })

  it("closes the eyes while a password field is focused or revealed", () => {
    const { container } = render(
      <AuthScene>
        <PasswordFixture />
      </AuthScene>
    )
    const password = screen.getByLabelText("Password")
    expect(eyes(container)).toBe("open")

    fireEvent.focus(password)
    expect(eyes(container)).toBe("closed")

    // Revealing keeps them closed after focus moves to the toggle.
    fireEvent.blur(password)
    fireEvent.click(screen.getByRole("button", { name: "Show" }))
    expect(eyes(container)).toBe("closed")

    fireEvent.click(screen.getByRole("button", { name: "Hide" }))
    expect(eyes(container)).toBe("open")

    fireEvent.focus(screen.getByLabelText("Email"))
    expect(eyes(container)).toBe("open")
  })

  it("reopens the eyes when a focused password field unmounts", () => {
    function Toggle() {
      const [mounted, setMounted] = useState(true)
      return (
        <>
          {mounted && <PasswordFixture />}
          <button type="button" onClick={() => setMounted(false)}>
            Remove
          </button>
        </>
      )
    }
    const { container } = render(
      <AuthScene>
        <Toggle />
      </AuthScene>
    )
    fireEvent.focus(screen.getByLabelText("Password"))
    expect(eyes(container)).toBe("closed")
    act(() => screen.getByRole("button", { name: "Remove" }).click())
    expect(eyes(container)).toBe("open")
  })

  it("does nothing outside an AuthScene", () => {
    render(<PasswordFixture />)
    expect(() =>
      fireEvent.focus(screen.getByLabelText("Password"))
    ).not.toThrow()
  })
})
