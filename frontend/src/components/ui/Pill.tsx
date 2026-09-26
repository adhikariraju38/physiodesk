import { cn } from "@/lib/cn";

/**
 * Status tags only. The primary/secondary/tertiary roles are for structure, so
 * they deliberately do not appear here.
 */
export type Tone = "success" | "danger" | "neutral" | "accent";

const TONES: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-neutral-soft text-neutral",
  accent: "bg-primary-soft text-primary-ink",
};

/** Every status string the api can return, mapped to the tone it reads as. */
const STATUS_TONES: Record<string, Tone> = {
  // patients
  active: "success",
  completed: "neutral",
  on_hold: "neutral",
  // appointments
  booked: "success",
  cancelled: "danger",
  no_show: "danger",
  // invoices
  paid: "success",
  due: "danger",
  void: "neutral",
};

export function statusTone(status: string): Tone {
  return STATUS_TONES[status] ?? "neutral";
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

type Props = {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
};

export function Pill({ tone = "neutral", children, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <Pill tone={statusTone(status)} className={className}>
      {statusLabel(status)}
    </Pill>
  );
}
