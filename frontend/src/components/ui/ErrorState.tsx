import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Props = {
  title: string;
  message: string;
  /** shown small and monospaced, so a user can quote it when reporting a problem */
  reference?: string;
  onRetry?: () => void;
  retryLabel?: string;
  homeHref?: string;
  homeLabel?: string;
};

export function ErrorState({
  title,
  message,
  reference,
  onRetry,
  retryLabel = "Try again",
  homeHref,
  homeLabel = "Back to dashboard",
}: Props) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md px-6 py-7 text-center">
        <h1 className="text-xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>

        {reference && (
          <p className="mt-4 rounded-lg bg-background px-3 py-2 font-mono text-[11px] text-muted">
            {reference}
          </p>
        )}

        <div className="mt-6 flex justify-center gap-2">
          {onRetry && <Button onClick={onRetry}>{retryLabel}</Button>}
          {homeHref && (
            <Link href={homeHref}>
              <Button variant="secondary">{homeLabel}</Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
