import StatusPanel from "@/shared/ui/StatusPanel"
import { act, render, screen } from "@testing-library/react"
import { toast, useToasterStore } from "react-hot-toast"
import { afterEach, describe, expect, it } from "vitest"

import FlaskLoader from "./FlaskLoader"

function ToastProbe() {
  const { toasts } = useToasterStore()
  return (
    <ul aria-label="Toasts">
      {toasts
        .filter((item) => item.visible)
        .map((item) => (
          <li key={item.id} data-type={item.type}>
            {item.message}
          </li>
        ))}
    </ul>
  )
}

describe("FlaskLoader", () => {
  afterEach(() => act(() => toast.remove()))

  it("announces a contextual status while hiding the decorative parts", () => {
    const { container } = render(
      <FlaskLoader label="Signing in" accessibleLabel="Signing in to Prahit" />
    )
    const status = screen.getByRole("status", { name: "Signing in to Prahit" })
    expect(status).toHaveAttribute("aria-live", "polite")
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true"
    )
    expect(container.querySelector(".sn-loader-label")).toHaveAttribute(
      "aria-hidden",
      "true"
    )
    expect(screen.getByText("Signing in")).toBeVisible()
  })

  it("gives every instance its own liquid clip", () => {
    const { container } = render(
      <>
        <FlaskLoader variant="page" />
        <FlaskLoader />
        <FlaskLoader variant="compact" label={false} />
      </>
    )
    const ids = [...container.querySelectorAll("clipPath")].map((c) => c.id)
    expect(new Set(ids).size).toBe(3)
    for (const id of ids)
      expect(container.querySelector(`g[clip-path="url(#${id})"]`)).not.toBe(
        null
      )
    expect(screen.getAllByRole("status")).toHaveLength(3)
    expect(container.querySelectorAll(".sn-loader-label")).toHaveLength(2)
  })

  it("stays silent inside a region that already reports status", () => {
    render(
      <StatusPanel
        tone="loading"
        title="Loading subjects"
        description="Finding the available course categories…"
      />
    )
    expect(screen.getAllByRole("status")).toHaveLength(1)
    expect(screen.getByRole("status")).toHaveTextContent("Loading subjects")
  })

  it("stands in for its action's loading toast but keeps outcome toasts", () => {
    const tree = (pending) => (
      <>
        <ToastProbe />
        {pending && <FlaskLoader replacesLoadingToast label="Signing in" />}
      </>
    )
    const view = render(tree(false))
    let id
    // As in the auth thunks: the loading toast and the pending state together.
    act(() => {
      id = toast.loading("Loading...")
      view.rerender(tree(true))
    })
    const list = () => screen.getByRole("list", { name: "Toasts" })
    expect(list().querySelector('[data-type="loading"]')).toBeNull()
    expect(screen.getByRole("status", { name: "Signing in" })).toBeVisible()

    act(() => toast.error("Login Failed"))
    expect(list()).toHaveTextContent("Login Failed")
    act(() => {
      view.rerender(tree(false))
      toast.dismiss(id)
    })
    expect(list()).toHaveTextContent("Login Failed")
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("leaves loading toasts alone unless asked to replace them", () => {
    render(
      <>
        <ToastProbe />
        <FlaskLoader label="Loading purchases" />
      </>
    )
    act(() => toast.loading("Saving your agreement..."))
    expect(
      screen
        .getByRole("list", { name: "Toasts" })
        .querySelector('[data-type="loading"]')
    ).toHaveTextContent("Saving your agreement...")
  })
})
