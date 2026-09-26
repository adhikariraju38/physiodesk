import { cn } from "@/lib/cn";

const CONTROL = cn(
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink",
  "placeholder:text-muted/70 transition-colors",
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
  "disabled:bg-background disabled:text-muted",
);

type Wrapper = {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
};

function Shell({
  label,
  error,
  hint,
  className,
  children,
}: Wrapper & { children: React.ReactNode }) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-muted">{hint}</span>
      )}
    </label>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> &
  Wrapper & { ref?: React.Ref<HTMLInputElement> };

export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <Shell label={label} error={error} hint={hint} className={className}>
      <input className={cn(CONTROL, error && "border-danger")} {...props} />
    </Shell>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> &
  Wrapper & { ref?: React.Ref<HTMLSelectElement> };

export function Select({ label, error, hint, className, children, ...props }: SelectProps) {
  return (
    <Shell label={label} error={error} hint={hint} className={className}>
      <select className={cn(CONTROL, "pr-8", error && "border-danger")} {...props}>
        {children}
      </select>
    </Shell>
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  Wrapper & { ref?: React.Ref<HTMLTextAreaElement> };

export function Textarea({ label, error, hint, className, ...props }: TextareaProps) {
  return (
    <Shell label={label} error={error} hint={hint} className={className}>
      <textarea rows={3} className={cn(CONTROL, "resize-y", error && "border-danger")} {...props} />
    </Shell>
  );
}
