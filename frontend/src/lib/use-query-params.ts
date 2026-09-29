"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type Value = string | number | null | undefined;

/**
 * Keeps list state in the address bar.
 *
 * Filters and page numbers belong in the url: a link to "patients on hold,
 * page two" should open on patients on hold, page two, and the back button
 * should walk through what the user actually did.
 *
 * Deliberate actions like changing a filter or turning a page are pushed, so
 * back undoes them. Typing is replaced instead, or a search box would bury the
 * previous page under one history entry per keystroke.
 */
export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const get = useCallback((key: string, fallback = "") => params.get(key) ?? fallback, [params]);

  const set = useCallback(
    (
      next: Record<string, Value>,
      options?: { resetPage?: boolean; history?: "push" | "replace" },
    ) => {
      const search = new URLSearchParams(params.toString());

      for (const [key, value] of Object.entries(next)) {
        // an empty filter is the default, so it stays out of the url entirely
        if (value === null || value === undefined || value === "") search.delete(key);
        else search.set(key, String(value));
      }

      // a narrower filter can leave you past the last page
      if (options?.resetPage) search.delete("page");

      const query = search.toString();
      const url = query ? `${pathname}?${query}` : pathname;

      const navigate = options?.history === "replace" ? router.replace : router.push;
      navigate(url, { scroll: false });
    },
    [params, pathname, router],
  );

  return { get, set };
}
