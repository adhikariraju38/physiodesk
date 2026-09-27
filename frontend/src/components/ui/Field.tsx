"use client";

import { useId } from "react";

import { cn } from "@/lib/cn";

export const CONTROL_CLASSES = cn(
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink",
  "placeholder:text-muted/70 transition-colors",
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
  "disabled:bg-background disabled:text-muted",
);

type ShellProps = {
  label?: string;
  error?: string;
  hint?: string;
  /** marks the field with an asterisk */
  required?: boolean;
  /** tags the field "Optional". deliberately explicit rather than "not required",
      so search boxes and filters do not get labelled as optional form fields */
  optional?: boolean;
  className?: string;
  htmlFor?: string;
  children: React.ReactNode;
};

export function FieldShell({
  label,
  error,
  hint,
  required,
  optional,
  className,
  htmlFor,
  children,
}: ShellProps) {
  return (
    <div className={cn("block", className)}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
            {label}
            {required && (
              <span className="ml-0.5 text-danger" aria-hidden="true">
                *
              </span>
            )}
          </label>
          {optional && <span className="text-[11px] text-muted">Optional</span>}
        </div>
      )}

      {children}

      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

/** Sits at the top of a form so the asterisk does not need explaining twice. */
export function RequiredNote() {
  return (
    <p className="text-xs text-muted">
      Fields marked <span className="text-danger">*</span> are required.
    </p>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> &
  Omit<ShellProps, "children" | "htmlFor"> & { ref?: React.Ref<HTMLInputElement> };

export function Input({ label, error, hint, required, optional, className, ...props }: InputProps) {
  const id = useId();

  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      required={required}
      optional={optional}
      className={className}
      htmlFor={id}
    >
      <input
        id={id}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL_CLASSES, error && "border-danger")}
        {...props}
      />
    </FieldShell>
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  Omit<ShellProps, "children" | "htmlFor"> & { ref?: React.Ref<HTMLTextAreaElement> };

export function Textarea({
  label,
  error,
  hint,
  required,
  optional,
  className,
  ...props
}: TextareaProps) {
  const id = useId();

  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      required={required}
      optional={optional}
      className={className}
      htmlFor={id}
    >
      <textarea
        id={id}
        rows={3}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL_CLASSES, "resize-y", error && "border-danger")}
        {...props}
      />
    </FieldShell>
  );
}
