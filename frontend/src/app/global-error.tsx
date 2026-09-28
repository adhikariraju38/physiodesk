"use client";

import { useEffect } from "react";

import "./globals.css";

/**
 * Last line of defence: an error in the root layout itself, where no other
 * boundary is mounted yet. It has to render its own html and body, and it
 * cannot rely on the fonts or providers having loaded.
 */
export default function GlobalError({
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
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background px-4 text-ink">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl">PhysioDesk could not start</h1>
          <p className="mt-2 text-sm text-muted">
            Something failed before the app finished loading. Reloading usually fixes it.
          </p>
          {error.digest && (
            <p className="mt-4 font-mono text-[11px] text-muted">Reference: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-6 h-10 cursor-pointer rounded-lg bg-primary px-4 text-sm font-medium text-white"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
