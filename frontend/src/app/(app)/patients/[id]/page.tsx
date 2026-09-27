"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PatientForm } from "@/components/patients/PatientForm";
import { BillingHistory, SessionHistory } from "@/components/patients/PatientHistory";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { KeyValue, KeyValueGrid } from "@/components/ui/KeyValue";
import { StatusPill } from "@/components/ui/Pill";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Patient } from "@/types/api";

export default function PatientProfilePage() {
  const params = useParams<{ id: string }>();
  const patientId = Number(params.id);
  const [editing, setEditing] = useState(false);

  const {
    data: patient,
    isPending,
    error,
  } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => api.get<Patient>(`/patients/${patientId}`),
  });

  if (isPending) {
    return (
      <>
        <PageHeader title="Patient" />
        <p className="px-6 py-10 text-sm text-muted">Loading…</p>
      </>
    );
  }

  if (error || !patient) {
    return (
      <>
        <PageHeader title="Patient" />
        <div className="px-6 py-10">
          <p role="alert" className="rounded-card bg-danger-soft px-4 py-3 text-sm text-danger">
            {error?.message ?? "That patient could not be loaded"}
          </p>
          <Link href="/patients" className="mt-4 inline-block text-sm text-primary underline">
            Back to patients
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={patient.full_name} description={patient.condition}>
        <Link href="/patients">
          <Button variant="secondary">All patients</Button>
        </Link>
        <Button onClick={() => setEditing(true)}>Edit</Button>
      </PageHeader>

      <div className="space-y-6 px-6 py-6">
        <Card>
          <CardHeader title="Overview" action={<StatusPill status={patient.status} />} />
          <KeyValueGrid>
            <KeyValue label="Phone">
              <span className="font-mono">{patient.phone}</span>
            </KeyValue>
            <KeyValue label="Age and gender">
              <span className="font-mono">{patient.age}</span>
              <span className="text-muted"> · {patient.gender}</span>
            </KeyValue>
            <KeyValue label="Condition">{patient.condition}</KeyValue>
            <KeyValue label="Assigned therapist">
              {patient.assigned_therapist ? (
                <>
                  {patient.assigned_therapist.full_name}
                  <span className="block text-xs text-muted">
                    {patient.assigned_therapist.specialty}
                  </span>
                </>
              ) : (
                <span className="text-muted">Not assigned</span>
              )}
            </KeyValue>
            <KeyValue label="Package">
              {patient.package ?? <span className="text-muted">None</span>}
            </KeyValue>
            <KeyValue label="On the register since">{formatDate(patient.created_at)}</KeyValue>
            <KeyValue label="Address">
              {patient.address ?? <span className="text-muted">Not recorded</span>}
            </KeyValue>
          </KeyValueGrid>
        </Card>

        <SessionHistory patientId={patient.id} />
        <BillingHistory patientId={patient.id} />
      </div>

      {editing && <PatientForm open patient={patient} onClose={() => setEditing(false)} />}
    </>
  );
}
