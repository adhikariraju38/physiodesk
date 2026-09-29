"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input, RequiredNote } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { ApiError, api } from "@/lib/api";
import { formatDate, formatTime, timeOptions, toDateInput } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { useInvalidate } from "@/lib/use-invalidate";
import type { ScheduleOverride, Therapist } from "@/types/api";

const TIMES = timeOptions();

const KINDS = [
  { value: "day_off", label: "Day off", hint: "Nothing can be booked" },
  { value: "custom", label: "Different hours", hint: "In, but not their usual times" },
];

/** Per date changes to one therapist's diary: a day off, or different hours. */
export function OverrideDialog({
  open,
  onClose,
  therapist,
}: {
  open: boolean;
  onClose: () => void;
  therapist: Therapist;
}) {
  const invalidate = useInvalidate();

  const [date, setDate] = useState(() => toDateInput(new Date()));
  const [kind, setKind] = useState("day_off");
  const [startTime, setStartTime] = useState(therapist.start_time);
  const [endTime, setEndTime] = useState(therapist.end_time);
  const [note, setNote] = useState("");

  const { data: existing, isPending } = useQuery({
    queryKey: keys.therapists.overrides(therapist.id),
    queryFn: () => api.get<ScheduleOverride[]>(`/therapists/${therapist.id}/overrides`),
    enabled: open,
  });

  const save = useMutation({
    mutationFn: () =>
      api.put<ScheduleOverride>(`/therapists/${therapist.id}/overrides`, {
        on_date: date,
        is_day_off: kind === "day_off",
        start_time: kind === "custom" ? startTime : null,
        end_time: kind === "custom" ? endTime : null,
        note: note.trim() || null,
      }),
    onSuccess: async () => {
      await invalidate("therapistSchedule");
      setNote("");
    },
  });

  const clear = useMutation({
    mutationFn: (on: string) => api.delete(`/therapists/${therapist.id}/overrides/${on}`),
    onSuccess: () => invalidate("therapistSchedule"),
  });

  const failure =
    save.error instanceof ApiError
      ? save.error.message
      : clear.error instanceof ApiError
        ? clear.error.message
        : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule changes"
      description={therapist.full_name}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" form="override-form" loading={save.isPending}>
            Save change
          </Button>
        </>
      }
    >
      <RequiredNote />

      <form
        id="override-form"
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <DatePicker label="Date" required value={date} onChange={setDate} />
        <Select label="Change" required options={KINDS} value={kind} onChange={setKind} />

        {kind === "custom" && (
          <>
            <Select
              label="Starts at"
              required
              options={TIMES}
              value={startTime}
              onChange={setStartTime}
            />
            <Select
              label="Finishes at"
              required
              options={TIMES}
              value={endTime}
              onChange={setEndTime}
            />
          </>
        )}

        <Input
          label="Note"
          optional
          className="sm:col-span-2"
          placeholder="e.g. Conference in Pokhara"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        {failure && (
          <p
            role="alert"
            className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2"
          >
            {failure}
          </p>
        )}
      </form>

      <div className="mt-6 border-t border-border pt-4">
        <p className="text-xs tracking-wide text-muted uppercase">Already set</p>

        {isPending ? (
          <p className="mt-3 text-sm text-muted">Checking…</p>
        ) : existing && existing.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {existing.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="text-ink">{formatDate(row.on_date)}</span>
                  <span className="text-muted">
                    {" · "}
                    {row.is_day_off
                      ? "Day off"
                      : row.start_time && row.end_time
                        ? `${formatTime(row.start_time)} to ${formatTime(row.end_time)}`
                        : "Working as usual"}
                    {row.note ? ` · ${row.note}` : ""}
                  </span>
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  loading={clear.isPending && clear.variables === row.on_date}
                  onClick={() => clear.mutate(row.on_date)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Nothing set, they work their usual week.</p>
        )}
      </div>
    </Modal>
  );
}
