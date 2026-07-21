const variants = {
  primary:
    "border-catalog-action bg-catalog-action text-white hover:bg-catalog-text",
  secondary:
    "border-catalog-border bg-catalog-surface text-catalog-text hover:bg-catalog-surface-muted",
  quiet:
    "border-transparent bg-transparent text-catalog-info hover:bg-catalog-surface-muted",
}

function Button({
  children,
  className = "",
  type = "button",
  variant = "primary",
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center rounded-product border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
        variants[variant] || variants.primary
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
