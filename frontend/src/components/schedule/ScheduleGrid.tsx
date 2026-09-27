"use client";

import { useMemo } from "react";

import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import type { DaySchedule, ScheduleSlot, TherapistDay } from "@/types/api";

type Props = {
  schedule: DaySchedule;
  onOpenSlot: (column: TherapistDay, startTime: string) => void;
  onOpenAppointment: (appointmentId: number) => void;
};

/** Every start time anyone works that day, so the rows line up across columns. */
function rowTimes(columns: TherapistDay[]): string[] {
  const times = new Set<string>();
  for (const column of columns) {
    for (const slot of column.slots) times.add(slot.start_time);
  }
  return [...times].sort();
}

function slotsByTime(column: TherapistDay): Map<string, ScheduleSlot> {
  return new Map(column.slots.map((slot) => [slot.start_time, slot]));
}

export function ScheduleGrid({ schedule, onOpenSlot, onOpenAppointment }: Props) {
  const columns = schedule.therapists;
  const times = useMemo(() => rowTimes(columns), [columns]);
  const lookup = useMemo(() => columns.map(slotsByTime), [columns]);

  if (columns.length === 0) {
    return <p className="px-5 py-12 text-center text-sm text-muted">No active therapists yet.</p>;
  }

  if (times.length === 0) {
    return (
      <p className="px-5 py-12 text-center text-sm text-muted">
        Nobody is working on this date, so there are no slots to show.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th scope="col" className="w-20 border-b border-border px-4 py-3 text-left">
              <span className="text-xs tracking-wide text-muted uppercase">Time</span>
            </th>

            {columns.map((column) => (
              <th
                key={column.therapist.id}
                scope="col"
                className="min-w-44 border-b border-l border-border px-4 py-3 text-left align-top"
              >
                <p className="font-medium text-ink">{column.therapist.full_name}</p>
                <p className="text-xs font-normal text-muted">{column.therapist.specialty}</p>

                {!column.on_duty && (
                  <Pill tone="neutral" className="mt-1.5">
                    Off today
                  </Pill>
                )}
                {column.note && (
                  <p className="mt-1 text-xs font-normal text-primary-ink">{column.note}</p>
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {times.map((time) => (
            <tr key={time}>
              <th scope="row" className="border-b border-border px-4 py-2 text-left align-middle">
                <span className="font-mono text-xs font-normal text-muted">{formatTime(time)}</span>
              </th>

              {columns.map((column, index) => {
                const slot = lookup[index].get(time);

                // the therapist either is not in, or does not have a slot that
                // starts at this time because their appointments run longer
                if (!slot) {
                  return (
                    <td
                      key={column.therapist.id}
                      className="border-b border-l border-border bg-background/60 px-4 py-2 text-center text-xs text-muted"
                    >
                      –
                    </td>
                  );
                }

                return (
                  <td key={column.therapist.id} className="border-b border-l border-border p-1.5">
                    <SlotCell
                      slot={slot}
                      onClick={() =>
                        slot.appointment
                          ? onOpenAppointment(slot.appointment.id)
                          : onOpenSlot(column, slot.start_time)
                      }
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SlotCell({ slot, onClick }: { slot: ScheduleSlot; onClick: () => void }) {
  const booked = slot.appointment !== null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
        booked
          ? "bg-primary-soft text-primary-ink hover:bg-primary-soft/70"
          : "border border-dashed border-border text-muted hover:border-primary hover:text-primary-ink",
      )}
    >
      {booked ? (
        <>
          <span className="block truncate font-medium">{slot.appointment?.patient.full_name}</span>
          <span className="block text-[11px] opacity-70">
            {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
          </span>
        </>
      ) : (
        <span className="block py-1">Open</span>
      )}
    </button>
  );
}

export function ScheduleLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 border-t border-border px-5 py-3 text-xs text-muted">
      <span className="flex items-center gap-2">
        <span className="h-3 w-5 rounded border border-dashed border-border" /> Open
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3 w-5 rounded bg-primary-soft" /> Booked
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3 w-5 rounded border border-border bg-background" /> Not working
      </span>
    </div>
  );
}
