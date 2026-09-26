import { Card } from "@/components/ui/Card";

/**
 * The spec asks for Fraunces numerals on the dashboard stat cards specifically,
 * while the type scale puts Plex Mono on figures. Headline numbers follow the
 * stat card rule, everything smaller (amounts, slots, ids) stays mono.
 */
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-display text-[32px] leading-none text-ink">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="px-5 py-4">
      <div className="h-4 w-24 rounded bg-border/70" />
      <div className="mt-3 h-8 w-16 rounded bg-border/70" />
    </Card>
  );
}
