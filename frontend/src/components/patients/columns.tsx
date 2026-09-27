import { StatusPill } from "@/components/ui/Pill";
import type { Column } from "@/components/ui/Table";
import type { Patient } from "@/types/api";

export const PATIENT_COLUMNS: Column<Patient>[] = [
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
  {
    key: "age",
    header: "Age",
    className: "w-px whitespace-nowrap",
    render: (patient) => (
      <span className="text-muted">
        <span className="font-mono text-ink">{patient.age}</span> · {patient.gender}
      </span>
    ),
  },
  { key: "condition", header: "Condition", render: (patient) => patient.condition },
  {
    key: "therapist",
    header: "Therapist",
    className: "whitespace-nowrap",
    render: (patient) =>
      patient.assigned_therapist?.full_name ?? <span className="text-muted">Unassigned</span>,
  },
  {
    key: "package",
    header: "Package",
    className: "whitespace-nowrap",
    render: (patient) => patient.package ?? <span className="text-muted">None</span>,
  },
  {
    key: "status",
    header: "Status",
    className: "w-px",
    render: (patient) => <StatusPill status={patient.status} />,
  },
];
