import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import CourseCard from "./Course_Card"

const course = {
  id: "507f1f77bcf86cd799439011",
  name: "Production React",
  description: "Build resilient React applications for real users.",
  thumbnailUrl: "https://res.cloudinary.com/example/image/upload/course.webp",
  price: 1499,
  currency: "INR",
  instructor: {
    id: "507f191e810c19729de860ea",
    name: "Asha Rao",
    imageUrl: null,
  },
  category: {
    id: "507f1f77bcf86cd799439012",
    name: "Web Development",
  },
  rating: { average: 4.7, count: 18 },
  durationSeconds: 10800,
  level: "intermediate",
  language: "en",
  enrollmentCount: 245,
  createdAt: "2026-07-20T10:00:00.000Z",
}

const renderCard = (value = course, props = {}) =>
  render(
    <MemoryRouter>
      <CourseCard course={value} {...props} />
    </MemoryRouter>
  )

describe("catalog course card", () => {
  it("links the stable DTO to the existing course-detail route", () => {
    renderCard()

    expect(
      screen.getByRole("link", { name: "View Production React course details" })
    ).toHaveAttribute("href", "/courses/507f1f77bcf86cd799439011")
    expect(
      screen.getByRole("heading", { name: "Production React", level: 2 })
    ).toBeVisible()
    expect(screen.getByText(/₹1,499/)).toBeVisible()
    expect(screen.getByText("By Asha Rao")).toBeVisible()
    expect(screen.getByText("Intermediate · English · 3 hr")).toBeVisible()
    expect(screen.getByText("245 learners")).toBeVisible()
    expect(screen.getByText("18 ratings")).toBeVisible()
    expect(
      screen.getByRole("img", { name: "Production React course thumbnail" })
    ).toBeVisible()
  })

  it("does not invent optional metadata or ratings", () => {
    renderCard({
      ...course,
      category: null,
      instructor: null,
      durationSeconds: 0,
      level: null,
      language: null,
      rating: { average: 0, count: 0 },
      enrollmentCount: 0,
    })

    expect(screen.getByText("Not yet rated")).toBeVisible()
    expect(screen.queryByText(/By /)).not.toBeInTheDocument()
    expect(screen.queryByText(/learners/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Intermediate/)).not.toBeInTheDocument()
  })

  it("shows an accessible fallback when a thumbnail fails", () => {
    const { container } = renderCard()
    fireEvent.error(container.querySelector("img"))

    expect(
      screen.getByRole("img", {
        name: "Production React course image unavailable",
      })
    ).toBeVisible()
  })

  it("keeps the dormant v1 slider DTO compatible during migration", () => {
    const { container } = renderCard(
      {
        _id: "507f1f77bcf86cd799439011",
        courseName: "Legacy React",
        courseDescription: "Existing v1 card data.",
        thumbnail:
          "https://res.cloudinary.com/example/image/upload/legacy.webp",
        price: 799,
        instructor: { firstName: "Dev", lastName: "Shah" },
        ratingAndReviews: [{ rating: 5 }],
        totalStudentsEnrolled: 2,
      },
      { Height: "h-[250px]" }
    )

    expect(
      screen.getByRole("link", { name: "View Legacy React course details" })
    ).toHaveAttribute("href", "/courses/507f1f77bcf86cd799439011")
    expect(screen.getByText("By Dev Shah")).toBeVisible()
    expect(screen.getByText("1 rating")).toBeVisible()
    expect(container.querySelector("article")).toHaveClass("catalog-theme")
    expect(container.querySelector("article > a > div")).toHaveClass(
      "h-[250px]"
    )
  })
})
