"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { INVOICE_COLUMNS } from "@/components/billing/columns";
import { InvoiceForm } from "@/components/billing/InvoiceForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Modal";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { Select } from "@/components/ui/Select";
import { type Column, DataTable, TablePagination, Toolbar } from "@/components/ui/Table";
import { ApiError, api, queryString } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { keys } from "@/lib/query-keys";
import { useUiStore } from "@/lib/ui-store";
import { useInvalidate } from "@/lib/use-invalidate";
import type { Invoice, Page } from "@/types/api";

const PAGE_SIZE = 12;

const STATUSES = [
  { value: "", label: "All invoices" },
  { value: "due", label: "Due", hint: "Raised but not settled" },
  { value: "paid", label: "Paid", hint: "Money received" },
  { value: "void", label: "Void", hint: "Cancelled paperwork" },
];

export default function BillingPage() {
  const status = useUiStore((state) => state.invoiceStatus);
  const setStatus = useUiStore((state) => state.setInvoiceStatus);
  const [page, setPage] = useState(1);
  const [raising, setRaising] = useState(false);
  const [voiding, setVoiding] = useState<Invoice | null>(null);
  const router = useRouter();

  const { isAdmin } = useAuth();
  const invalidate = useInvalidate();

  useEffect(() => setPage(1), [status]);

  const { data, isPending, error } = useQuery({
    queryKey: keys.invoices.list({ status, page }),
    queryFn: () =>
      api.get<Page<Invoice>>(`/invoices${queryString({ status, page, page_size: PAGE_SIZE })}`),
    placeholderData: keepPreviousData,
  });

  const markPaid = useMutation({
    mutationFn: (invoice: Invoice) =>
      api.patch<Invoice>(`/invoices/${invoice.id}`, { status: "paid" }),
    onSuccess: () => invalidate("invoice"),
  });

  const voidInvoice = useMutation({
    mutationFn: (invoice: Invoice) => api.delete(`/invoices/${invoice.id}`),
    onSuccess: async () => {
      await invalidate("invoice");
      setVoiding(null);
    },
  });

  // staff can read billing but not change it, so the column is not there at all
  const columns = useMemo<Column<Invoice>[]>(() => {
    if (!isAdmin) return INVOICE_COLUMNS;

    return [
      ...INVOICE_COLUMNS,
      {
        key: "actions",
        header: "",
        className: "w-px",
        render: (invoice) => (
          // the row opens the invoice, so these clicks stop here
          <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
            {invoice.status === "due" && (
              <Button
                variant="secondary"
                size="sm"
                loading={markPaid.isPending && markPaid.variables?.id === invoice.id}
                onClick={() => markPaid.mutate(invoice)}
              >
                Mark paid
              </Button>
            )}
            {invoice.status !== "void" && (
              <Button variant="destructive" size="sm" onClick={() => setVoiding(invoice)}>
                Void
              </Button>
            )}
          </div>
        ),
      },
    ];
  }, [isAdmin, markPaid]);

  return (
    <>
      <PageHeader title="Billing" description="Invoices raised by the clinic">
        {isAdmin && <Button onClick={() => setRaising(true)}>Raise invoice</Button>}
      </PageHeader>

      <div className="flex min-h-0 flex-1 flex-col px-6 py-6">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Toolbar>
            <Select
              label="Status"
              options={STATUSES}
              value={status}
              onChange={setStatus}
              className="w-52"
            />
            <div className="ml-auto flex items-center gap-3">
              {!isAdmin && <span className="text-xs text-muted">Read only</span>}
              <RefreshButton queryKey={keys.invoices.all} label="Refresh invoices" />
            </div>
          </Toolbar>

          <DataTable
            fill
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(invoice) => invoice.id}
            onRowClick={(invoice) => router.push(`/billing/${invoice.id}`)}
            isLoading={isPending}
            error={error?.message ?? null}
            emptyMessage={status ? "No invoices with that status" : "Nothing billed yet"}
          />

          {data && (
            <TablePagination
              page={data.page}
              pages={data.pages}
              total={data.total}
              onChange={setPage}
            />
          )}
        </Card>
      </div>

      {raising && <InvoiceForm open onClose={() => setRaising(false)} />}

      <ConfirmDialog
        open={voiding !== null}
        onClose={() => {
          voidInvoice.reset();
          setVoiding(null);
        }}
        onConfirm={() => voiding && voidInvoice.mutate(voiding)}
        title="Void invoice"
        message={`${voiding?.invoice_number ?? "This invoice"} will be marked void. The number stays on the books so the run does not break.`}
        confirmLabel="Void invoice"
        busy={voidInvoice.isPending}
        error={voidInvoice.error instanceof ApiError ? voidInvoice.error.message : null}
      />
    </>
  );
}
