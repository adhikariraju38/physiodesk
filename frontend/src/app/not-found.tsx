import Link from "next/link";

/** Unmatched urls land here, outside the app shell, so it stands on its own. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <p className="font-mono text-sm text-muted">404</p>
        <h1 className="mt-2 text-2xl">Page not found</h1>
        <p className="mt-2 text-sm text-muted">
          That address does not match anything in PhysioDesk.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
