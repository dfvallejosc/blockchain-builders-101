interface LogoProps {
  className?: string
}

export const Logo = ({ className }: LogoProps) => (
  <svg aria-hidden="true" viewBox="0 0 32 32" className={className}>
    <rect x="3" y="2" width="26" height="28" rx="6" style={{ fill: 'var(--ha-primary)' }} />
    <circle cx="16" cy="7.5" r="2.5" style={{ fill: 'var(--ha-brand-yellow)' }} />
    <path
      d="m10.5 19 4 4 7.5-8.5"
      fill="none"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ stroke: 'var(--ha-on-primary)' }}
    />
  </svg>
)
