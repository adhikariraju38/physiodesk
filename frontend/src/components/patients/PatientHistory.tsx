"use client";

import { useQuery } from "@tanstack/react-query";

import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/Pill";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { type Column, DataTable } from "@/components/ui/Table";
import { api, queryString } from "@/lib/api";
import { keys } from "@/lib/query-keys";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import type { Appointment, Invoice, Page } from "@/types/api";

const SESSION_COLUMNS: Column<Appointment>[] = [
  {
    key: "when",
    header: "When",
    className: "whitespace-nowrap",
    render: (appointment) => (
      <div>
        <p className="text-ink">{formatDate(appointment.appt_date)}</p>
        <p className="font-mono text-xs text-muted">
          {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
        </p>
      </div>
    ),
  },
  {
    key: "therapist",
    header: "Therapist",
    render: (appointment) => (
      <div>
        <p className="text-ink">{appointment.therapist.full_name}</p>
        {/* appointments carry no separate treatment type, the therapist's
            specialty is the closest thing the schema has */}
        <p className="text-xs text-muted">{appointment.therapist.specialty}</p>
      </div>
    ),
  },
  {
    key: "notes",
    header: "Notes",
    render: (appointment) => appointment.notes ?? <span className="text-muted">No notes</span>,
  },
  {
    key: "status",
    header: "Status",
    className: "w-px",
    render: (appointment) => <StatusPill status={appointment.status} />,
  },
];

const INVOICE_COLUMNS: Column<Invoice>[] = [
  {
    key: "number",
    header: "Invoice",
    className: "whitespace-nowrap",
    render: (invoice) => <span className="font-mono text-ink">{invoice.invoice_number}</span>,
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
    render: (invoice) => <span className="font-mono text-ink">{formatMoney(invoice.total)}</span>,
  },
  {
    key: "status",
    header: "Status",
    className: "w-px",
    render: (invoice) => <StatusPill status={invoice.status} />,
  },
];

export function SessionHistory({ patientId }: { patientId: number }) {
  const { data, isPending, error } = useQuery({
    queryKey: keys.appointments.forPatient(patientId),
    queryFn: () => api.get<Appointment[]>(`/appointments${queryString({ patient_id: patientId })}`),
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Session history"
        description="Every appointment booked for this patient"
        action={<RefreshButton queryKey={keys.appointments.forPatient(patientId)} />}
      />
      <DataTable
        columns={SESSION_COLUMNS}
        rows={data ?? []}
        rowKey={(appointment) => appointment.id}
        isLoading={isPending}
        error={error?.message ?? null}
        emptyMessage="No sessions booked yet"
      />
    </Card>
  );
}

export function BillingHistory({ patientId }: { patientId: number }) {
  const { data, isPending, error } = useQuery({
    queryKey: keys.invoices.forPatient(patientId),
    queryFn: () =>
      api.get<Page<Invoice>>(`/invoices${queryString({ patient_id: patientId, page_size: 50 })}`),
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Billing history"
        description="Invoices raised against this patient"
        action={<RefreshButton queryKey={keys.invoices.forPatient(patientId)} />}
      />
      <DataTable
        columns={INVOICE_COLUMNS}
        rows={data?.items ?? []}
        rowKey={(invoice) => invoice.id}
        isLoading={isPending}
        error={error?.message ?? null}
        emptyMessage="Nothing billed yet"
      />
    </Card>
  );
}
