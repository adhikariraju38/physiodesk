"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { INVOICE_COLUMNS } from "@/components/billing/columns";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { Select } from "@/components/ui/Select";
import { DataTable, TablePagination, Toolbar } from "@/components/ui/Table";
import { api, queryString } from "@/lib/api";
import { keys } from "@/lib/query-keys";
import { useUiStore } from "@/lib/ui-store";
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

  useEffect(() => setPage(1), [status]);

  const { data, isPending, error } = useQuery({
    queryKey: keys.invoices.list({ status, page }),
    queryFn: () =>
      api.get<Page<Invoice>>(`/invoices${queryString({ status, page, page_size: PAGE_SIZE })}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Billing" description="Invoices raised by the clinic" />

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
            <div className="ml-auto">
              <RefreshButton queryKey={keys.invoices.all} label="Refresh invoices" />
            </div>
          </Toolbar>

          <DataTable
            fill
            columns={INVOICE_COLUMNS}
            rows={data?.items ?? []}
            rowKey={(invoice) => invoice.id}
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
    </>
  );
}
