"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { FieldShell } from "@/components/ui/Field";
import { useAnchoredPanel } from "@/components/ui/use-anchored";
import { cn } from "@/lib/cn";

export type SelectOption = {
  value: string;
  label: string;
  /** small second line, used for therapist specialties */
  hint?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  /** adds a filter box to the panel, for lists like the whole patient register */
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  name?: string;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
    >
      <path d="M6 8l4 4 4-4" />
    </svg>
  );
}

function TickIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-3.5 w-3.5"
    >
      <path d="M4 10.5l4 4 8-8" />
    </svg>
  );
}

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = "Select…",
  error,
  hint,
  required,
  optional,
  searchable,
  disabled,
  className,
  name,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [filter, setFilter] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();

  const { triggerRef, panelRef, style } = useAnchoredPanel(open, () => setOpen(false));
  const selected = options.find((option) => option.value === value);

  const visible = useMemo(() => {
    if (!searchable || !filter.trim()) return options;
    const needle = filter.trim().toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) || option.hint?.toLowerCase().includes(needle),
    );
  }, [options, filter, searchable]);

  // opening should land on whatever is currently chosen, not the top of the list
  useEffect(() => {
    if (!open) return;
    setFilter("");
    const index = options.findIndex((option) => option.value === value);
    setActive(index < 0 ? 0 : index);
    // with a filter box the keystrokes belong there, otherwise the list takes them
    if (searchable) searchRef.current?.focus();
    else panelRef.current?.focus();
  }, [open, options, value, panelRef, searchable]);

  // filtering can leave the highlight past the end of the shorter list
  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(visible.length - 1, 0)));
  }, [visible.length]);

  function choose(index: number) {
    const option = visible[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onPanelKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((current) => Math.min(current + 1, visible.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((current) => Math.max(current - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(visible.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        break;
      case "Escape":
      case "Tab":
        setOpen(false);
        triggerRef.current?.focus();
        break;
    }
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
      {/* the real value travels with the form, the button is only the control */}
      {name && <input type="hidden" name={name} value={value} readOnly />}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border bg-surface px-3 py-2 text-left text-sm transition-colors",
          "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
          "disabled:bg-background disabled:text-muted",
          error ? "border-danger" : "border-border",
          open && "border-primary ring-2 ring-primary/20",
        )}
      >
        <span className={cn("truncate", selected ? "text-ink" : "text-muted")}>
          {selected?.label ?? placeholder}
        </span>
        <span className="text-muted">
          <ChevronIcon open={open} />
        </span>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={`${listId}-${active}`}
            onKeyDown={onPanelKeyDown}
            style={style}
            className="z-[60] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-1 shadow-card focus:outline-none"
          >
            {searchable && (
              <input
                ref={searchRef}
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                onKeyDown={onPanelKeyDown}
                placeholder="Type to filter…"
                aria-label="Filter the list"
                className="mb-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none"
              />
            )}

            {visible.map((option, index) => {
              const isSelected = option.value === value;

              return (
                <div
                  key={option.value}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(index)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm",
                    index === active ? "bg-primary-soft text-primary-ink" : "text-ink",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.hint && (
                      <span className="block truncate text-xs text-muted">{option.hint}</span>
                    )}
                  </span>
                  {isSelected && (
                    <span className="text-primary">
                      <TickIcon />
                    </span>
                  )}
                </div>
              );
            })}

            {visible.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted">
                {filter ? "Nothing matches that" : "Nothing to choose from"}
              </p>
            )}
          </div>,
          document.body,
        )}
    </FieldShell>
  );
}
