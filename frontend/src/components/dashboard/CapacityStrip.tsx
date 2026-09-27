import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import type { TherapistCapacity } from "@/types/api";

export function CapacityStrip({ capacity }: { capacity: TherapistCapacity[] }) {
  return (
    <Card>
      <CardHeader
        title="Today's capacity"
        description="Booked against free slots for everyone on duty"
      />

      {capacity.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-muted">Nobody is on duty today.</p>
      ) : (
        <div className="divide-y divide-border">
          {capacity.map((row) => (
            <div key={row.therapist.id} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{row.therapist.full_name}</p>
                  <p className="text-xs text-muted">{row.therapist.specialty}</p>
                </div>
                <p className="text-xs text-muted">
                  <span className="font-mono text-ink">{row.booked}</span> booked
                  <span className="mx-1.5 text-border">|</span>
                  <span className="font-mono text-ink">{row.free}</span> free
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {row.slots.map((slot) => (
                  <span
                    key={slot.start_time}
                    title={slot.patient_name ?? "Open"}
                    className={cn(
                      "rounded-md px-2 py-1 font-mono text-[11px]",
                      slot.is_booked
                        ? "bg-primary-soft text-primary-ink"
                        : "border border-border bg-background text-muted",
                    )}
                  >
                    {formatTime(slot.start_time)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function CapacityStripSkeleton() {
  return (
    <Card>
      <CardHeader
        title="Today's capacity"
        description="Booked against free slots for everyone on duty"
      />
      <div className="divide-y divide-border">
        {Array.from({ length: 3 }, (_, row) => (
          <div key={row} className="px-5 py-4">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="mt-2 h-3 w-28" />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Array.from({ length: 8 }, (_, slot) => (
                <Skeleton key={slot} className="h-[26px] w-14" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
