import Link from "next/link"

type Props = {
  href: string
  children: React.ReactNode
  /** Header variant: 44px tall instead of the field-grade 52px. */
  compacto?: boolean
  className?: string
}

/**
 * The landing's primary action. Solid ink, paper text, 1px border, a small
 * arrow that shifts 3px on hover (landing.css `.cta`). The clickable area
 * never moves.
 */
export function BotonPrincipal({
  href,
  children,
  compacto = false,
  className = "",
}: Props) {
  const altura = compacto ? "min-h-11 text-sm" : "tap text-base"
  return (
    <Link
      href={href}
      className={`cta inline-flex items-center justify-center gap-2 rounded-md border border-ink bg-ink px-5 font-semibold text-paper focus-ink ${altura} ${className}`}
    >
      <span>{children}</span>
      <svg
        className="cta__flecha"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 8h10M9 4l4 4-4 4" />
      </svg>
    </Link>
  )
}
