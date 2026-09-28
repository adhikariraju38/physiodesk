import { StatusPill } from "@/components/ui/Pill";
import type { Column } from "@/components/ui/Table";
import { formatDate, formatMoney } from "@/lib/format";
import type { Invoice } from "@/types/api";

export const INVOICE_COLUMNS: Column<Invoice>[] = [
  {
    key: "number",
    header: "Invoice",
    className: "whitespace-nowrap",
    render: (invoice) => <span className="font-mono text-ink">{invoice.invoice_number}</span>,
  },
  {
    key: "patient",
    header: "Patient",
    render: (invoice) => (
      <div>
        <p className="font-medium text-ink">{invoice.patient.full_name}</p>
        <p className="font-mono text-xs text-muted">{invoice.patient.phone}</p>
      </div>
    ),
  },
  {
    key: "issued",
    header: "Issued",
    className: "whitespace-nowrap",
    render: (invoice) => formatDate(invoice.issued_date),
  },
  { key: "service", header: "Service", render: (invoice) => invoice.service },
  {
    key: "total",
    header: "Total",
    className: "whitespace-nowrap text-right",
    render: (invoice) => (
      <div>
        <p className="font-mono text-ink">{formatMoney(invoice.total)}</p>
        {Number(invoice.discount) > 0 && (
          <p className="font-mono text-xs text-muted">less {formatMoney(invoice.discount)}</p>
        )}
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-px",
    render: (invoice) => <StatusPill status={invoice.status} />,
  },
];
