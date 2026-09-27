"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/PageHeader";
import { ScheduleGrid, ScheduleLegend } from "@/components/schedule/ScheduleGrid";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { LoadingPanel } from "@/components/ui/Skeleton";
import { DatePicker } from "@/components/ui/DatePicker";
import { api } from "@/lib/api";
import { keys } from "@/lib/query-keys";
import { useUiStore } from "@/lib/ui-store";
import { formatDate, toDateInput } from "@/lib/format";
import type { DaySchedule } from "@/types/api";

function shiftDay(date: string, days: number): string {
  const moved = new Date(`${date}T00:00:00`);
  moved.setDate(moved.getDate() + days);
  return toDateInput(moved);
}

export default function SchedulePage() {
  const today = toDateInput(new Date());

  // the chosen day follows you around the app rather than snapping back to today
  const date = useUiStore((state) => state.scheduleDate);
  const setDate = useUiStore((state) => state.setScheduleDate);

  const { data, isPending, error } = useQuery({
    queryKey: keys.schedule.day(date),
    queryFn: () => api.get<DaySchedule>(`/schedule?date=${date}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Schedule" description={formatDate(date)}>
        <Button variant="secondary" size="sm" onClick={() => setDate(shiftDay(date, -1))}>
          Previous
        </Button>
        <DatePicker compact value={date} onChange={setDate} />
        <Button variant="secondary" size="sm" onClick={() => setDate(shiftDay(date, 1))}>
          Next
        </Button>
        <Button size="sm" onClick={() => setDate(today)} disabled={date === today}>
          Today
        </Button>
        <RefreshButton queryKey={keys.schedule.all} label="Refresh schedule" />
      </PageHeader>

      <div className="px-6 py-6">
        <Card className="overflow-hidden">
          {isPending && <LoadingPanel label="Loading the day\u2019s diary\u2026" />}

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
