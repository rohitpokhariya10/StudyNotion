export default function IconBtn({
  text,
  onclick,
  children,
  disabled,
  outline = false,
  customClasses = "",
  type = "button",
}) {
  return (
    <button
      disabled={disabled}
      onClick={onclick}
      className={`sn-btn ${outline ? "sn-btn-outline" : "sn-btn-primary"} ${customClasses}`}
      type={type === "submit" ? "submit" : "button"}
    >
      {children ? (
        <>
          <span>{text}</span>
          {children}
        </>
      ) : (
        text
      )}
    </button>
  )
}
