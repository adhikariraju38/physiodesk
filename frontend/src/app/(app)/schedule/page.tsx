"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { ScheduleGrid, ScheduleLegend } from "@/components/schedule/ScheduleGrid";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { formatDate, toDateInput } from "@/lib/format";
import type { DaySchedule } from "@/types/api";

function shiftDay(date: string, days: number): string {
  const moved = new Date(`${date}T00:00:00`);
  moved.setDate(moved.getDate() + days);
  return toDateInput(moved);
}

export default function SchedulePage() {
  const today = toDateInput(new Date());
  const [date, setDate] = useState(today);

  const { data, isPending, error } = useQuery({
    queryKey: ["schedule", date],
    queryFn: () => api.get<DaySchedule>(`/schedule?date=${date}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Schedule" description={formatDate(date)}>
        <Button variant="secondary" size="sm" onClick={() => setDate(shiftDay(date, -1))}>
          Previous
        </Button>
        <input
          type="date"
          value={date}
          onChange={(event) => event.target.value && setDate(event.target.value)}
          className="h-8 rounded-lg border border-border bg-surface px-3 font-mono text-[13px] text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
        <Button variant="secondary" size="sm" onClick={() => setDate(shiftDay(date, 1))}>
          Next
        </Button>
        <Button size="sm" onClick={() => setDate(today)} disabled={date === today}>
          Today
        </Button>
      </PageHeader>

      <div className="px-6 py-6">
        <Card className="overflow-hidden">
          {isPending && <p className="px-5 py-12 text-center text-sm text-muted">Loading…</p>}

          {error && (
            <p role="alert" className="px-5 py-12 text-center text-sm text-danger">
              {error.message}
            </p>
          )}

          {data && (
            <>
              <ScheduleGrid
                schedule={data}
                onOpenSlot={() => undefined}
                onOpenAppointment={() => undefined}
              />
              <ScheduleLegend />
            </>
          )}
        </Card>
      </div>
    </>
  );
}
