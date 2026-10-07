// Returns a long-form date, or null when the value is missing or invalid so
// callers can show a friendly placeholder instead of "Invalid Date".
export const formattedDate = (date) => {
  if (date === null || date === undefined || date === "") return null
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return null
  return value.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}
