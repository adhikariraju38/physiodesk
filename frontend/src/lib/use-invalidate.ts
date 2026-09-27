"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { type MutationSubject, invalidatesAfter } from "@/lib/query-keys";

/**
 * Drops everything a write could have made stale.
 *
 * Takes the subjects that were written rather than raw keys, so no call site
 * has to remember that booking an appointment also moves the dashboard.
 */
export function useInvalidate(): (...subjects: MutationSubject[]) => Promise<void> {
  const queryClient = useQueryClient();

  return useCallback(
    async (...subjects: MutationSubject[]) => {
      const keys = subjects.flatMap((subject) => invalidatesAfter[subject]);

      // the same root can come from two subjects, invalidate it once
      const unique = new Map(keys.map((key) => [JSON.stringify(key), key]));

      await Promise.all(
        [...unique.values()].map((key) => queryClient.invalidateQueries({ queryKey: [...key] })),
      );
    },
    [queryClient],
  );
}
