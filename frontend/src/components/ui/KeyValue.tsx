export function KeyValueGrid({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid gap-x-8 gap-y-5 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
  );
}

export function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{children}</dd>
    </div>
  );
}
