"use client";

import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { cn } from "@/lib/cn";

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-4 w-4", spinning && "animate-spin")}
    >
      <path d="M20 11a8 8 0 0 0-14.1-4.5M4 13a8 8 0 0 0 14.1 4.5" />
      <path d="M20 5v6h-6M4 19v-6h6" />
    </svg>
  );
}

/**
 * Manual refetch for a table.
 *
 * Mutations invalidate their own keys, so this is a safety net rather than the
 * normal path: if something was changed in another tab, or an invalidation
 * missed, this refetches just this list instead of reloading the whole app.
 */
export function RefreshButton({
  queryKey,
  label = "Refresh",
}: {
  queryKey: readonly unknown[];
  label?: string;
}) {
  const queryClient = useQueryClient();
  const [justAsked, setJustAsked] = useState(false);

  // counts only the queries this button is responsible for
  const fetching = useIsFetching({ queryKey: [...queryKey] }) > 0;
  const spinning = fetching || justAsked;

  async function refresh() {
    setJustAsked(true);
    try {
      await queryClient.invalidateQueries({ queryKey: [...queryKey] });
    } finally {
      setJustAsked(false);
    }
  }

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={spinning}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors",
        "hover:bg-background hover:text-ink",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:pointer-events-none disabled:opacity-60",
      )}
    >
      <RefreshIcon spinning={spinning} />
    </button>
  );
}
