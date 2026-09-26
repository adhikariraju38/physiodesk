/** Small inline icon set, so the sidebar does not pull in an icon package. */
type Props = { className?: string };

function Glyph({ children, className }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "h-[18px] w-[18px]"}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: Props) {
  return (
    <Glyph {...props}>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="11" width="7" height="10" rx="1.5" />
    </Glyph>
  );
}

export function PatientsIcon(props: Props) {
  return (
    <Glyph {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 11.2A3 3 0 0 0 16 5.3" />
      <path d="M17.5 20a5.4 5.4 0 0 0-2.2-4.3" />
    </Glyph>
  );
}

export function ScheduleIcon(props: Props) {
  return (
    <Glyph {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Glyph>
  );
}

export function BillingIcon(props: Props) {
  return (
    <Glyph {...props}>
      <path d="M5 3h14v18l-3-1.7-2 1.7-2-1.7-2 1.7-2-1.7L5 21z" />
      <path d="M9 8h6M9 12h6" />
    </Glyph>
  );
}

export function TherapistsIcon(props: Props) {
  return (
    <Glyph {...props}>
      <path d="M8 3v4a4 4 0 0 0 8 0V3" />
      <path d="M12 11v3a4 4 0 0 0 8 0v-1" />
      <circle cx="20" cy="11" r="1.6" />
    </Glyph>
  );
}

export function SignOutIcon(props: Props) {
  return (
    <Glyph {...props}>
      <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
      <path d="M10 8l-4 4 4 4M6 12h9" />
    </Glyph>
  );
}
