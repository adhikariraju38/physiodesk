import { cn } from "@/lib/cn";

/** A grey block standing in for content that has not arrived yet. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded bg-border/70", className)} />;
}

/**
 * Circular loader. Sized through className so the same one works in a button,
 * in a table row and in the middle of an empty panel.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("h-4 w-4 animate-spin", className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2.5} opacity={0.2} />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Used where a whole card or panel is waiting on its first response. */
export function LoadingPanel({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex justify-center px-5 py-16 text-primary">
      <Spinner className="h-7 w-7" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
