function FormField({ children, hint, htmlFor, label }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label
        className="text-sm font-semibold text-text-primary"
        htmlFor={htmlFor}
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs leading-5 text-text-secondary">{hint}</p>}
    </div>
  )
}

export default FormField
