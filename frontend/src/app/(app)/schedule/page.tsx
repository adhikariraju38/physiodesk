"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { AppointmentModal } from "@/components/schedule/AppointmentModal";
import { BookingModal } from "@/components/schedule/BookingModal";
import { ScheduleGrid, ScheduleLegend } from "@/components/schedule/ScheduleGrid";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { LoadingPanel } from "@/components/ui/Skeleton";
import { DatePicker } from "@/components/ui/DatePicker";
import { api } from "@/lib/api";
import { keys } from "@/lib/query-keys";
import { useQueryParams } from "@/lib/use-query-params";
import { formatDate, toDateInput } from "@/lib/format";
import type { DaySchedule, ScheduleSlot, TherapistBrief } from "@/types/api";

function shiftDay(date: string, days: number): string {
  const moved = new Date(`${date}T00:00:00`);
  moved.setDate(moved.getDate() + days);
  return toDateInput(moved);
}

type Booking = { therapist: TherapistBrief; slot: ScheduleSlot };

function ScheduleView() {
  const today = toDateInput(new Date());

  // the day is in the url, so a link to a particular date opens on it. today
  // is the default, so it is left out rather than written in.
  const { get, set } = useQueryParams();
  const date = get("date") || today;
  const setDate = (next: string) => set({ date: next === today ? null : next });

  const [booking, setBooking] = useState<Booking | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);

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
                onOpenSlot={(column, slot) => setBooking({ therapist: column.therapist, slot })}
                onOpenAppointment={setViewing}
              />
              <ScheduleLegend />
            </>
          )}
        </Card>
      </div>

      {booking && (
        <BookingModal
          open
          onClose={() => setBooking(null)}
          therapist={booking.therapist}
          date={date}
          startTime={booking.slot.start_time}
          endTime={booking.slot.end_time}
        />
      )}

      {viewing !== null && (
        <AppointmentModal open onClose={() => setViewing(null)} appointmentId={viewing} />
      )}
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
          <PageHeader title="Schedule" />
          <LoadingPanel />
        </>
      }
    >
      <ScheduleView />
    </Suspense>
  );
}
