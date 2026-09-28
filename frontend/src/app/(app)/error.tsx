"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ui/ErrorState";

/**
 * Catches anything thrown while rendering a page inside the app shell.
 *
 * The sidebar stays, so the user can carry on somewhere else. The real error
 * goes to the console rather than on screen, because a framework stack trace
 * means nothing to a receptionist and can leak internals.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong on this page"
      message="The page could not be shown. Trying again usually sorts it out."
      reference={error.digest && `Reference: ${error.digest}`}
      onRetry={reset}
      homeHref="/dashboard"
    />
  );
}
