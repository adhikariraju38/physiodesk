import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/Pill";
import { type Column, DataTable } from "@/components/ui/Table";
import type { Patient } from "@/types/api";

const COLUMNS: Column<Patient>[] = [
  {
    key: "name",
    header: "Patient",
    render: (patient) => (
      <div>
        <p className="font-medium text-ink">{patient.full_name}</p>
        <p className="font-mono text-xs text-muted">{patient.phone}</p>
      </div>
    ),
  },
  { key: "condition", header: "Condition", render: (patient) => patient.condition },
  {
    key: "therapist",
    header: "Therapist",
    render: (patient) =>
      patient.assigned_therapist?.full_name ?? <span className="text-muted">Unassigned</span>,
  },
  {
    key: "package",
    header: "Package",
    render: (patient) => patient.package ?? <span className="text-muted">None</span>,
  },
  {
    key: "status",
    header: "Status",
    className: "w-px",
    render: (patient) => <StatusPill status={patient.status} />,
  },
];

export function RecentPatients({
  patients,
  isLoading,
}: {
  patients: Patient[];
  isLoading?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Recent patients" description="The latest additions to the register" />
      <DataTable
        columns={COLUMNS}
        rows={patients}
        rowKey={(patient) => patient.id}
        isLoading={isLoading}
        emptyMessage="No patients on file yet"
      />
    </Card>
  );
}
