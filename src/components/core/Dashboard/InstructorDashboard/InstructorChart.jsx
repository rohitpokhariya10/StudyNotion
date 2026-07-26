import { Chart, registerables } from "chart.js"
import { useState } from "react"
import { Pie } from "react-chartjs-2"

Chart.register(...registerables)

const CHART_COLORS = [
  "#facc15",
  "#06b6d4",
  "#8b5cf6",
  "#22c55e",
  "#f97316",
  "#ec4899",
  "#3b82f6",
  "#ef4444",
]

const getChartColors = (count) =>
  Array.from(
    { length: count },
    (_, index) => CHART_COLORS[index % CHART_COLORS.length]
  )

export default function InstructorChart({ courses }) {
  // State to keep track of the currently selected chart
  const [currChart, setCurrChart] = useState("students")

  const chartColors = getChartColors(courses.length)

  // Data for the chart displaying student information
  const chartDataStudents = {
    labels: courses.map((course) => course.courseName),
    datasets: [
      {
        data: courses.map((course) => course.totalStudentsEnrolled),
        backgroundColor: chartColors,
      },
    ],
  }

  // Data for the chart displaying income information
  const chartIncomeData = {
    labels: courses.map((course) => course.courseName),
    datasets: [
      {
        data: courses.map((course) => course.totalAmountGenerated),
        backgroundColor: chartColors,
      },
    ],
  }

  // Options for the chart
  const options = {
    animation: false,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
  }

  const selectedValues =
    currChart === "students"
      ? courses.map((course) => course.totalStudentsEnrolled)
      : courses.map((course) => course.totalAmountGenerated)

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-y-4 rounded-md bg-richblack-800 p-6">
      <p className="text-lg font-bold text-richblack-5">Visualize</p>
      <div className="space-x-4 font-semibold">
        {/* Button to switch to the "students" chart */}
        <button
          type="button"
          onClick={() => setCurrChart("students")}
          aria-pressed={currChart === "students"}
          className={`rounded-sm p-1 px-3 transition-all duration-200 ${
            currChart === "students"
              ? "bg-richblack-700 text-yellow-50"
              : "text-yellow-400"
          }`}
        >
          Students
        </button>
        {/* Button to switch to the "income" chart */}
        <button
          type="button"
          onClick={() => setCurrChart("income")}
          aria-pressed={currChart === "income"}
          className={`rounded-sm p-1 px-3 transition-all duration-200 ${
            currChart === "income"
              ? "bg-richblack-700 text-yellow-50"
              : "text-yellow-400"
          }`}
        >
          Income
        </button>
      </div>
      <ul
        className="grid gap-2 text-xs text-richblack-200 sm:grid-cols-2"
        aria-label={`${currChart === "students" ? "Student" : "Income"} chart legend`}
      >
        {courses.map((course, index) => (
          <li
            key={course._id || course.courseName}
            className="flex min-w-0 items-center gap-2"
          >
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: chartColors[index] }}
              aria-hidden="true"
            />
            <span className="truncate">
              {course.courseName}: {selectedValues[index] || 0}
            </span>
          </li>
        ))}
      </ul>
      <div
        className="relative mx-auto h-72 w-full max-w-[420px] sm:h-80 lg:h-full"
        role="img"
        aria-label={`${currChart === "students" ? "Students" : "Income"} by course pie chart`}
      >
        {/* Render the Pie chart based on the selected chart */}
        <Pie
          data={currChart === "students" ? chartDataStudents : chartIncomeData}
          options={options}
        />
      </div>
    </div>
  )
}
