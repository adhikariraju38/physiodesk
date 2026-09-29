"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { StatusPill } from "@/components/ui/Pill";
import { LoadingPanel } from "@/components/ui/Skeleton";
import { ApiError, api } from "@/lib/api";
import { formatDate, formatDateTime, formatMoney, humanLabel } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import type { Invoice } from "@/types/api";

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const invoiceId = Number(params.id);

  const {
    data: invoice,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: keys.invoices.detail(invoiceId),
    queryFn: () => api.get<Invoice>(`/invoices/${invoiceId}`),
    retry: false,
  });

  if (isPending) {
    return (
      <>
        <PageHeader title="Invoice" />
        <LoadingPanel label="Loading the invoice" />
      </>
    );
  }

  if (error instanceof ApiError && error.status === 404) notFound();

  if (error || !invoice) {
    return (
      <>
        <PageHeader title="Invoice" />
        <ErrorState
          title="That invoice could not be loaded"
          message={error?.message ?? "The record did not come back from the server."}
          onRetry={() => refetch()}
          homeHref="/billing"
          homeLabel="Back to billing"
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={invoice.invoice_number} description="Invoice">
        <Link href="/billing">
          <Button variant="secondary">All invoices</Button>
        </Link>
        <Button onClick={() => window.print()}>Print</Button>
      </PageHeader>

      <div className="px-6 py-6">
        {/* the only thing on the page when printed, see the print rules in globals.css */}
        <Card className="mx-auto max-w-2xl px-8 py-8 print:border-0 print:shadow-none">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-display text-xl text-ink">PhysioDesk</p>
              <p className="mt-0.5 text-sm text-muted">Physiotherapy clinic</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm text-ink">{invoice.invoice_number}</p>
              <p className="mt-0.5 text-sm text-muted">{formatDate(invoice.issued_date)}</p>
              <StatusPill status={invoice.status} className="mt-2" />
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-5">
            <p className="text-xs tracking-wide text-muted uppercase">Billed to</p>
            <p className="mt-1 text-ink">{invoice.patient.full_name}</p>
            <p className="font-mono text-sm text-muted">{invoice.patient.phone}</p>
          </div>

          <table className="mt-7 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 text-xs font-medium tracking-wide text-muted uppercase">
                  Service
                </th>
                <th className="pb-2 text-right text-xs font-medium tracking-wide text-muted uppercase">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3 text-ink">{invoice.service}</td>
                <td className="py-3 text-right font-mono text-ink">
                  {formatMoney(invoice.amount)}
                </td>
              </tr>
              {Number(invoice.discount) > 0 && (
                <tr>
                  <td className="py-1 text-muted">Discount</td>
                  <td className="py-1 text-right font-mono text-muted">
                    -{formatMoney(invoice.discount)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td className="pt-3 font-medium text-ink">Total</td>
                <td className="pt-3 text-right font-mono text-lg text-ink">
                  {formatMoney(invoice.total)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-8 border-t border-border pt-4 text-sm text-muted">
            {invoice.status === "paid" ? (
              <p>
                Paid
                {invoice.payment_method
                  ? ` by ${humanLabel(invoice.payment_method).toLowerCase()}`
                  : ""}
                {invoice.paid_at ? ` on ${formatDateTime(invoice.paid_at)}` : ""}.
              </p>
            ) : invoice.status === "void" ? (
              <p>This invoice has been voided.</p>
            ) : (
              <p>Payment is still outstanding.</p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
