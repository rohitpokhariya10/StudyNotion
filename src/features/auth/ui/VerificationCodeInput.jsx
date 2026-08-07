import { useEffect, useRef } from "react"

const CODE_LENGTH = 6

const digitsOnly = (value) => value.replace(/\D/g, "")

function VerificationCodeInput({ autoFocus = false, onChange, value }) {
  const inputRefs = useRef([])
  const normalizedValue = digitsOnly(value).slice(0, CODE_LENGTH)

  useEffect(() => {
    if (autoFocus) inputRefs.current[0]?.focus()
  }, [autoFocus])

  const focusInput = (index) => inputRefs.current[index]?.focus()

  const insertDigits = (index, input) => {
    const digits = digitsOnly(input)
    if (!digits) return

    const insertionIndex = Math.min(index, normalizedValue.length)
    const nextValue = (
      normalizedValue.slice(0, insertionIndex) +
      digits +
      normalizedValue.slice(insertionIndex + digits.length)
    ).slice(0, CODE_LENGTH)

    onChange(nextValue)
    focusInput(Math.min(insertionIndex + digits.length, CODE_LENGTH - 1))
  }

  const removeDigit = (index) => {
    if (normalizedValue[index]) {
      onChange(
        normalizedValue.slice(0, index) + normalizedValue.slice(index + 1)
      )
      focusInput(index)
      return
    }

    if (index > 0) {
      onChange(
        normalizedValue.slice(0, index - 1) + normalizedValue.slice(index)
      )
      focusInput(index - 1)
    }
  }

  return (
    <div
      aria-label="Verification code"
      className="flex justify-between gap-x-1.5"
      role="group"
    >
      {Array.from({ length: CODE_LENGTH }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element
          }}
          aria-label={`Verification code digit ${index + 1}`}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          className="aspect-square w-[48px] rounded-[0.5rem] border-0 bg-richblack-800 text-center text-richblack-5 shadow-[inset_0_-1px_0_rgba(255,255,255,0.18)] focus:border-0 focus:outline-2 focus:outline-yellow-50 lg:w-[60px]"
          inputMode="numeric"
          maxLength={1}
          onChange={(event) => insertDigits(index, event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          onKeyDown={(event) => {
            if (event.key === "Backspace") {
              event.preventDefault()
              removeDigit(index)
            } else if (event.key === "Delete") {
              event.preventDefault()
              if (normalizedValue[index]) removeDigit(index)
            } else if (event.key === "ArrowLeft" && index > 0) {
              event.preventDefault()
              focusInput(index - 1)
            } else if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
              event.preventDefault()
              focusInput(index + 1)
            }
          }}
          onPaste={(event) => {
            event.preventDefault()
            insertDigits(index, event.clipboardData.getData("text"))
          }}
          pattern="[0-9]*"
          placeholder="-"
          type="text"
          value={normalizedValue[index] || ""}
        />
      ))}
    </div>
  )
}

export default VerificationCodeInput
