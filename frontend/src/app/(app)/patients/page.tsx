"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PATIENT_COLUMNS } from "@/components/patients/columns";
import { PatientForm } from "@/components/patients/PatientForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { type Column, DataTable, TablePagination, Toolbar } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ApiError, api, queryString } from "@/lib/api";
import { useDebounced } from "@/lib/use-debounced";
import type { Page, Patient, PatientStatus } from "@/types/api";

const PAGE_SIZE = 10;

const STATUSES: { value: PatientStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On hold" },
];

export default function PatientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PatientStatus | "">("");
  const [page, setPage] = useState(1);

  // undefined means the form is closed, null means "add", a patient means "edit"
  const [editing, setEditing] = useState<Patient | null | undefined>(undefined);
  const [removing, setRemoving] = useState<Patient | null>(null);

  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: (patient: Patient) => api.delete(`/patients/${patient.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setRemoving(null);
    },
  });

  const debouncedSearch = useDebounced(search);

  // a narrower filter can leave you past the last page, so start over
  useEffect(() => setPage(1), [debouncedSearch, status]);

  const { data, isPending, error } = useQuery({
    queryKey: ["patients", { search: debouncedSearch, status, page }],
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
            <Button variant="ghost" size="sm" onClick={() => setRemoving(patient)}>
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

      <div className="px-6 py-6">
        <Card className="overflow-hidden">
          <Toolbar>
            <Input
              label="Search"
              placeholder="Name or phone number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full max-w-xs"
            />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as PatientStatus | "")}
              className="w-44"
            >
              {STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Toolbar>

          <DataTable
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
