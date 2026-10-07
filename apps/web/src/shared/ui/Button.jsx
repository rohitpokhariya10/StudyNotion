const variants = {
  primary: "sn-btn-primary",
  secondary: "sn-btn-secondary",
  outline: "sn-btn-outline",
  quiet: "sn-btn-ghost",
  ghost: "sn-btn-ghost",
  destructive: "sn-btn-destructive",
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
      type={type === "submit" ? "submit" : "button"}
      className={`sn-btn text-sm disabled:cursor-not-allowed disabled:opacity-55 ${
        variants[variant] || variants.primary
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
