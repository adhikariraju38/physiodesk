import { Spinner } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

export type Column<T> = {
  key: string;
  header: string;
  /** tailwind classes for both the header cell and the body cells */
  className?: string;
  render: (row: T) => React.ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  /** fill the space the card gives it and scroll the rows, keeping the
      toolbar above and the pager below on screen */
  fill?: boolean;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  isLoading,
  error,
  emptyMessage = "Nothing to show yet",
  fill,
}: Props<T>) {
  return (
    <div className={cn("overflow-auto", fill ? "min-h-0 flex-1 overscroll-y-contain" : "")}>
      <table className="w-full border-collapse text-sm">
        {/* sticky, so the column names stay put while the rows scroll under them */}
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="text-left">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "border-b border-border bg-surface px-5 py-3 text-xs font-medium tracking-wide text-muted uppercase",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={columns.length} className="px-5 py-16">
                <div role="status" aria-live="polite" className="flex justify-center text-primary">
                  <Spinner className="h-6 w-6" />
                  <span className="sr-only">Loading</span>
                </div>
              </td>
            </tr>
          )}

          {!isLoading && error && (
            <StatusRow span={columns.length} tone="danger">
              {error}
            </StatusRow>
          )}

          {!isLoading && !error && rows.length === 0 && (
            <StatusRow span={columns.length}>{emptyMessage}</StatusRow>
          )}

          {!isLoading &&
            !error &&
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-border/70 last:border-0",
                  onRowClick && "cursor-pointer transition-colors hover:bg-background",
                )}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-5 py-3.5 align-middle", column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusRow({
  span,
  tone,
  children,
}: {
  span: number;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td
        colSpan={span}
        className={cn(
          "px-5 py-12 text-center text-sm",
          tone === "danger" ? "text-danger" : "text-muted",
        )}
      >
        {children}
      </td>
    </tr>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    // one line on anything wider than a phone, where it stacks rather than
    // wrapping into a ragged second row
    <div className="flex shrink-0 flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-end">
      {children}
    </div>
  );
}

export function TablePagination({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (total === 0) return null;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm">
      <p className="text-muted">
        Page <span className="font-mono">{page}</span> of <span className="font-mono">{pages}</span>
        <span className="mx-2 text-border">|</span>
        <span className="font-mono">{total}</span> in total
      </p>

      <div className="flex gap-2">
        <PageButton disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </PageButton>
        <PageButton disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] text-ink transition-colors hover:bg-background disabled:pointer-events-none disabled:opacity-45"
    >
      {children}
    </button>
  );
}
