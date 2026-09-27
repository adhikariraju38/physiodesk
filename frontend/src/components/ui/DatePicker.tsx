"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { FieldShell } from "@/components/ui/Field";
import { useAnchoredPanel } from "@/components/ui/use-anchored";
import { cn } from "@/lib/cn";
import { formatDate, toDateInput } from "@/lib/format";

// monday first, so it lines up with the weekday numbering the api uses
const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** Days to leave empty before the 1st, counting from monday. */
function leadingBlanks(firstOfMonth: Date): number {
  return (firstOfMonth.getDay() + 6) % 7;
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-4 w-4", direction === "right" && "rotate-180")}
    >
      <path d="M12 4l-5 6 5 6" />
    </svg>
  );
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  /** compact form for the schedule toolbar, where it sits between two buttons */
  compact?: boolean;
};

export function DatePicker({
  value,
  onChange,
  label,
  error,
  hint,
  required,
  optional,
  className,
  compact,
}: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => startOfMonth(parseDate(value)));

  const { triggerRef, panelRef, style } = useAnchoredPanel(open, () => setOpen(false), 330);

  // reopening should land on the month holding the current value, not wherever
  // the user last browsed to
  useEffect(() => {
    if (open) setView(startOfMonth(parseDate(value)));
  }, [open, value]);

  const today = toDateInput(new Date());
  const firstOfMonth = startOfMonth(view);
  const dayCount = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();

  function pick(day: number) {
    onChange(toDateInput(new Date(view.getFullYear(), view.getMonth(), day)));
    setOpen(false);
    triggerRef.current?.focus();
  }

  function shiftMonth(months: number) {
    setView(new Date(view.getFullYear(), view.getMonth() + months, 1));
  }

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-surface text-left transition-colors",
        "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
        compact ? "h-8 px-3 text-[13px]" : "w-full px-3 py-2 text-sm",
        error ? "border-danger" : "border-border",
        open && "border-primary ring-2 ring-primary/20",
      )}
    >
      <span className="text-muted">
        <CalendarIcon />
      </span>
      <span className="truncate text-ink">{formatDate(value)}</span>
    </button>
  );

  const panel =
    open &&
    createPortal(
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Choose a date"
        style={style}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            triggerRef.current?.focus();
          }
        }}
        className="z-[60] w-[268px] rounded-xl border border-border bg-surface p-3 shadow-card"
      >
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-background hover:text-ink"
          >
            <Arrow direction="left" />
          </button>

          <p className="text-sm font-medium text-ink">{monthLabel(view)}</p>

          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-background hover:text-ink"
          >
            <Arrow direction="right" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {WEEKDAY_INITIALS.map((initial, index) => (
            <span
              key={`${initial}-${index}`}
              className="py-1 text-center text-[11px] font-medium text-muted"
            >
              {initial}
            </span>
          ))}

          {Array.from({ length: leadingBlanks(firstOfMonth) }, (_, index) => (
            <span key={`blank-${index}`} />
          ))}

          {Array.from({ length: dayCount }, (_, index) => {
            const day = index + 1;
            const iso = toDateInput(new Date(view.getFullYear(), view.getMonth(), day));
            const isSelected = iso === value;
            const isToday = iso === today;

            return (
              <button
                key={iso}
                type="button"
                onClick={() => pick(day)}
                aria-current={isToday ? "date" : undefined}
                className={cn(
                  "h-8 rounded-lg font-mono text-[13px] transition-colors",
                  isSelected
                    ? "bg-primary font-medium text-white"
                    : isToday
                      ? "bg-primary-soft text-primary-ink"
                      : "text-ink hover:bg-background",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            onChange(today);
            setOpen(false);
          }}
          className="mt-2 w-full rounded-lg border border-border py-1.5 text-[13px] text-ink transition-colors hover:bg-background"
        >
          Today
        </button>
      </div>,
      document.body,
    );

  if (!label) {
    return (
      <div className={className}>
        {trigger}
        {panel}
      </div>
    );
  }

  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      required={required}
      optional={optional}
      className={className}
    >
      {trigger}
      {panel}
    </FieldShell>
  );
}
