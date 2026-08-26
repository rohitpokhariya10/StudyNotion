function FormField({ children, hint, htmlFor, label }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label
        className="text-sm font-semibold text-catalog-text"
        htmlFor={htmlFor}
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs leading-5 text-catalog-muted">{hint}</p>}
    </div>
  )
}

export default FormField
