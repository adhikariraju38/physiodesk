"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PATIENT_COLUMNS } from "@/components/patients/columns";
import { PatientForm } from "@/components/patients/PatientForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { type Column, DataTable, TablePagination, Toolbar } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ui/Modal";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { ApiError, api, queryString } from "@/lib/api";
import { keys } from "@/lib/query-keys";
import { useUiStore } from "@/lib/ui-store";
import { useInvalidate } from "@/lib/use-invalidate";
import { useDebounced } from "@/lib/use-debounced";
import type { Page, Patient } from "@/types/api";

const PAGE_SIZE = 10;

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On hold" },
];

export default function PatientsPage() {
  const router = useRouter();

  // kept in the ui store so coming back from a patient profile does not wipe
  // the filters the user set
  const search = useUiStore((state) => state.patientSearch);
  const status = useUiStore((state) => state.patientStatus);
  const setFilters = useUiStore((state) => state.setPatientFilters);
  const [page, setPage] = useState(1);

  // undefined means the form is closed, null means "add", a patient means "edit"
  const [editing, setEditing] = useState<Patient | null | undefined>(undefined);
  const [removing, setRemoving] = useState<Patient | null>(null);

  const invalidate = useInvalidate();

  const remove = useMutation({
    mutationFn: (patient: Patient) => api.delete(`/patients/${patient.id}`),
    onSuccess: async () => {
      await invalidate("patient");
      setRemoving(null);
    },
  });

  const debouncedSearch = useDebounced(search);

  // a narrower filter can leave you past the last page, so start over
  useEffect(() => setPage(1), [debouncedSearch, status]);

  const listKey = keys.patients.list({ search: debouncedSearch, status, page });

  const { data, isPending, error } = useQuery({
    queryKey: listKey,
    queryFn: () =>
      api.get<Page<Patient>>(
        `/patients${queryString({ search: debouncedSearch, status, page, page_size: PAGE_SIZE })}`,
      ),
    // keeps the old rows on screen while the next page loads, instead of flashing empty
    placeholderData: keepPreviousData,
  });

  const columns = useMemo<Column<Patient>[]>(
    () => [
      ...PATIENT_COLUMNS,
      {
        key: "actions",
        header: "",
        className: "w-px",
        render: (patient) => (
          // the row itself opens the profile, so these clicks stop here
          <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
            <Button variant="secondary" size="sm" onClick={() => setEditing(patient)}>
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setRemoving(patient)}>
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader title="Patients" description="Everyone on the clinic register">
        <Button onClick={() => setEditing(null)}>Add patient</Button>
      </PageHeader>

      <div className="flex min-h-0 flex-1 flex-col px-6 py-6">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Toolbar>
            <Input
              label="Search"
              placeholder="Name or phone number"
              value={search}
              onChange={(event) => setFilters({ search: event.target.value })}
              className="w-full min-w-0 sm:max-w-xs"
            />
            <Select
              label="Status"
              options={STATUSES}
              value={status}
              onChange={(next) => setFilters({ status: next })}
              className="w-48"
            />

            <div className="ml-auto">
              <RefreshButton queryKey={keys.patients.all} label="Refresh patients" />
            </div>
          </Toolbar>

          <DataTable
            fill
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(patient) => patient.id}
            onRowClick={(patient) => router.push(`/patients/${patient.id}`)}
            isLoading={isPending}
            error={error?.message ?? null}
            emptyMessage={
              debouncedSearch || status ? "No patients match those filters" : "No patients yet"
            }
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

      {editing !== undefined && (
        <PatientForm
          // remount per patient, otherwise the form keeps the previous defaults
          key={editing?.id ?? "new"}
          open
          patient={editing ?? undefined}
          onClose={() => setEditing(undefined)}
        />
      )}

      <ConfirmDialog
        open={removing !== null}
        onClose={() => {
          remove.reset();
          setRemoving(null);
        }}
        onConfirm={() => removing && remove.mutate(removing)}
        title="Remove patient"
        message={`${removing?.full_name ?? "This patient"} and their appointment history will be deleted. This cannot be undone.`}
        confirmLabel="Delete patient"
        busy={remove.isPending}
        error={remove.error instanceof ApiError ? remove.error.message : null}
      />
    </>
  );
}
