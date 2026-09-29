"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PatientForm } from "@/components/patients/PatientForm";
import { BillingHistory, SessionHistory } from "@/components/patients/PatientHistory";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { KeyValue, KeyValueGrid } from "@/components/ui/KeyValue";
import { StatusPill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError, api } from "@/lib/api";
import { keys } from "@/lib/query-keys";
import { ErrorState } from "@/components/ui/ErrorState";
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
    refetch,
  } = useQuery({
    queryKey: keys.patients.detail(patientId),
    queryFn: () => api.get<Patient>(`/patients/${patientId}`),
    retry: false,
  });

  if (isPending) {
    return (
      <>
        <PageHeader title="Patient" />
        <div className="px-6 py-6">
          <Card className="px-5 py-5">
            <Skeleton className="h-5 w-32" />
            <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index}>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-2 h-4 w-36" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </>
    );
  }

  // a link to a deleted patient should look like any other missing page
  if (error instanceof ApiError && error.status === 404) notFound();

  if (error || !patient) {
    return (
      <>
        <PageHeader title="Patient" />
        <ErrorState
          title="That patient could not be loaded"
          message={error?.message ?? "The record did not come back from the server."}
          onRetry={() => refetch()}
          homeHref="/patients"
          homeLabel="Back to patients"
        />
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
