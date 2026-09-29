"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

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
import { LoadingPanel } from "@/components/ui/Skeleton";
import { ApiError, api, queryString } from "@/lib/api";
import { keys } from "@/lib/query-keys";
import { useInvalidate } from "@/lib/use-invalidate";
import { useQueryParams } from "@/lib/use-query-params";
import { useUrlSearch } from "@/lib/use-url-search";
import type { Page, Patient } from "@/types/api";

const PAGE_SIZE = 10;

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On hold" },
];

function PatientsList() {
  const router = useRouter();

  // the filters and the page live in the url, so a link opens the same view
  const { get, set } = useQueryParams();
  const search = useUrlSearch();
  const status = get("status");
  const page = Number(get("page", "1")) || 1;

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

  const listKey = keys.patients.list({ search: search.settled, status, page });

  const { data, isPending, error } = useQuery({
    queryKey: listKey,
    queryFn: () =>
      api.get<Page<Patient>>(
        `/patients${queryString({ search: search.settled, status, page, page_size: PAGE_SIZE })}`,
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
              value={search.value}
              onChange={(event) => search.setValue(event.target.value)}
              className="w-full min-w-0 sm:max-w-xs"
            />
            <Select
              label="Status"
              options={STATUSES}
              value={status}
              onChange={(next) => set({ status: next }, { resetPage: true })}
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
              search.settled || status ? "No patients match those filters" : "No patients yet"
            }
          />

          {data && (
            <TablePagination
              page={data.page}
              pages={data.pages}
              total={data.total}
              onChange={(next) => set({ page: next })}
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

/**
 * useSearchParams needs a boundary above it, otherwise next cannot prerender
 * any part of the route.
 */
export default function Page() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Patients" />
          <LoadingPanel />
        </>
      }
    >
      <PatientsList />
    </Suspense>
  );
}
