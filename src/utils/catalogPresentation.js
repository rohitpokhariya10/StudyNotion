export const formatCatalogPrice = (price, currency = "INR") => {
  const amount = Number(price)
  const normalizedCurrency = /^[A-Z]{3}$/.test(currency) ? currency : "INR"
  if (!Number.isFinite(amount)) return "Price unavailable"

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount)
  } catch {
    return `INR ${amount.toLocaleString("en-IN")}`
  }
}

export const formatCatalogDuration = (durationSeconds) => {
  const totalSeconds = Number(durationSeconds)
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return null

  const totalMinutes = Math.ceil(totalSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (!hours) return `${minutes} min`
  if (!minutes) return `${hours} hr`
  return `${hours} hr ${minutes} min`
}

export const formatCatalogLanguage = (language) => {
  if (typeof language !== "string" || !language.trim()) return null
  const code = language.trim().toLowerCase()

  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) || code
  } catch {
    return code.toUpperCase()
  }
}

export const formatCatalogLevel = (level) => {
  if (typeof level !== "string" || !level.trim()) return null
  const value = level.trim()
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}
