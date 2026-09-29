"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { OverrideDialog } from "@/components/therapists/OverrideDialog";
import { TherapistForm } from "@/components/therapists/TherapistForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { LoadingPanel } from "@/components/ui/Skeleton";
import { Select } from "@/components/ui/Select";
import { type Column, DataTable, Toolbar } from "@/components/ui/Table";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatTime, formatWorkingDays, toDateInput } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { useQueryParams } from "@/lib/use-query-params";
import { useInvalidate } from "@/lib/use-invalidate";
import type { DaySchedule, Therapist } from "@/types/api";

const VISIBILITY = [
  { value: "true", label: "On the roster" },
  { value: "", label: "Everyone", hint: "Including people who have left" },
];

function TherapistsRoster() {
  const { isAdmin } = useAuth();
  const invalidate = useInvalidate();

  const { get, set } = useQueryParams();
  const onlyActive = get("active", "true");
  const [editing, setEditing] = useState<Therapist | null | undefined>(undefined);
  const [overriding, setOverriding] = useState<Therapist | null>(null);
  const [removing, setRemoving] = useState<Therapist | null>(null);

  const activeOnly = onlyActive === "true";

  const { data, isPending, error } = useQuery({
    queryKey: keys.therapists.list(activeOnly),
    queryFn: () => api.get<Therapist[]>(`/therapists${activeOnly ? "?active=true" : ""}`),
  });

  // the roster wants a "seen today" count and the schedule already knows it,
  // rather than adding another endpoint for one number
  const today = toDateInput(new Date());
  const { data: todaySchedule } = useQuery({
    queryKey: keys.schedule.day(today),
    queryFn: () => api.get<DaySchedule>(`/schedule?date=${today}`),
  });

  const seenToday = useMemo(() => {
    const counts = new Map<number, number>();
    for (const column of todaySchedule?.therapists ?? []) {
      counts.set(column.therapist.id, column.slots.filter((slot) => slot.is_booked).length);
    }
    return counts;
  }, [todaySchedule]);

  const deactivate = useMutation({
    mutationFn: (therapist: Therapist) => api.delete(`/therapists/${therapist.id}`),
    onSuccess: async () => {
      await invalidate("therapist");
      setRemoving(null);
    },
  });

  const columns = useMemo<Column<Therapist>[]>(() => {
    const base: Column<Therapist>[] = [
      {
        key: "name",
        header: "Therapist",
        render: (therapist) => (
          <div>
            <p className="font-medium text-ink">{therapist.full_name}</p>
            <p className="text-xs text-muted">{therapist.specialty}</p>
          </div>
        ),
      },
      {
        key: "days",
        header: "Working days",
        className: "whitespace-nowrap",
        render: (therapist) => formatWorkingDays(therapist.working_days),
      },
      {
        key: "hours",
        header: "Hours",
        className: "whitespace-nowrap",
        render: (therapist) => (
          <span className="font-mono text-ink">
            {formatTime(therapist.start_time)}–{formatTime(therapist.end_time)}
          </span>
        ),
      },
      {
        key: "slot",
        header: "Session",
        className: "whitespace-nowrap",
        render: (therapist) => (
          <span className="font-mono text-ink">{therapist.slot_duration_min} min</span>
        ),
      },
      {
        key: "today",
        header: "Booked today",
        className: "whitespace-nowrap text-right",
        render: (therapist) => (
          <span className="font-mono text-ink">{seenToday.get(therapist.id) ?? 0}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        className: "w-px",
        render: (therapist) =>
          therapist.is_active ? (
            <Pill tone="success">On roster</Pill>
          ) : (
            <Pill tone="neutral">Left</Pill>
          ),
      },
    ];

    if (!isAdmin) return base;

    return [
      ...base,
      {
        key: "actions",
        header: "",
        className: "w-px",
        render: (therapist) => (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOverriding(therapist)}>
              Schedule
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditing(therapist)}>
              Edit
            </Button>
            {therapist.is_active && (
              <Button variant="destructive" size="sm" onClick={() => setRemoving(therapist)}>
                Remove
              </Button>
            )}
          </div>
        ),
      },
    ];
  }, [isAdmin, seenToday]);

  return (
    <>
      <PageHeader title="Therapists" description="Who works here and when">
        {isAdmin && <Button onClick={() => setEditing(null)}>Add therapist</Button>}
      </PageHeader>

      <div className="flex min-h-0 flex-1 flex-col px-6 py-6">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Toolbar>
            <Select
              label="Showing"
              options={VISIBILITY}
              value={onlyActive}
              onChange={(next) => set({ active: next === "true" ? null : next })}
              className="w-56"
            />
            <div className="ml-auto flex items-center gap-3">
              {!isAdmin && <span className="text-xs text-muted">Read only</span>}
              <RefreshButton queryKey={keys.therapists.all} label="Refresh roster" />
            </div>
          </Toolbar>

          <DataTable
            fill
            columns={columns}
            rows={data ?? []}
            rowKey={(therapist) => therapist.id}
            isLoading={isPending}
            error={error?.message ?? null}
            emptyMessage="Nobody on the roster yet"
          />
        </Card>
      </div>

      {editing !== undefined && (
        <TherapistForm
          key={editing?.id ?? "new"}
          open
          therapist={editing ?? undefined}
          onClose={() => setEditing(undefined)}
        />
      )}

      {overriding && (
        <OverrideDialog open onClose={() => setOverriding(null)} therapist={overriding} />
      )}

      <ConfirmDialog
        open={removing !== null}
        onClose={() => {
          deactivate.reset();
          setRemoving(null);
        }}
        onConfirm={() => removing && deactivate.mutate(removing)}
        title="Remove from the roster"
        message={`${removing?.full_name ?? "This therapist"} will be taken off the calendar. Past appointments stay on record, and any still to come have to be moved first.`}
        confirmLabel="Remove"
        busy={deactivate.isPending}
        error={deactivate.error instanceof ApiError ? deactivate.error.message : null}
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
          <PageHeader title="Therapists" />
          <LoadingPanel />
        </>
      }
    >
      <TherapistsRoster />
    </Suspense>
  );
}
