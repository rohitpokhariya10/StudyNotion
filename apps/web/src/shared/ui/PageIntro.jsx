export default function PageIntro({
  eyebrow,
  title,
  description,
  action,
  children,
  className = "",
}) {
  return (
    <header className={`sn-page-intro ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="sn-eyebrow">{eyebrow}</p>}
        <h1 className="sn-heading">{title}</h1>
        {description && <p className="sn-lead mt-3">{description}</p>}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
