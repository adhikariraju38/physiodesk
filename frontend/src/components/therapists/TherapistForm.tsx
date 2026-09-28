"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { FieldShell, Input, RequiredNote } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { timeOptions, weekdayName } from "@/lib/format";
import { useInvalidate } from "@/lib/use-invalidate";
import type { Therapist } from "@/types/api";

const TIMES = timeOptions();

const SLOT_LENGTHS = [30, 45, 60, 90].map((minutes) => ({
  value: String(minutes),
  label: `${minutes} minutes`,
}));

export function TherapistForm({
  open,
  onClose,
  therapist,
}: {
  open: boolean;
  onClose: () => void;
  therapist?: Therapist;
}) {
  const invalidate = useInvalidate();
  const editing = therapist !== undefined;

  const [fullName, setFullName] = useState(therapist?.full_name ?? "");
  const [specialty, setSpecialty] = useState(therapist?.specialty ?? "");
  const [startTime, setStartTime] = useState(therapist?.start_time ?? "09:00:00");
  const [endTime, setEndTime] = useState(therapist?.end_time ?? "17:00:00");
  const [slot, setSlot] = useState(String(therapist?.slot_duration_min ?? 45));
  const [days, setDays] = useState<number[]>(therapist?.working_days ?? [0, 1, 2, 3, 4]);
  const [touched, setTouched] = useState(false);

  const problems = {
    fullName: fullName.trim().length < 2 ? "Give their full name" : undefined,
    specialty: specialty.trim().length < 2 ? "What do they treat?" : undefined,
    hours: startTime >= endTime ? "The day has to end after it starts" : undefined,
    days: days.length === 0 ? "Pick at least one working day" : undefined,
  };
  const valid = Object.values(problems).every((problem) => problem === undefined);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        full_name: fullName.trim(),
        specialty: specialty.trim(),
        start_time: startTime,
        end_time: endTime,
        slot_duration_min: Number(slot),
        working_days: days,
      };

      return editing
        ? api.patch<Therapist>(`/therapists/${therapist.id}`, body)
        : api.post<Therapist>("/therapists", body);
    },
    onSuccess: async () => {
      await invalidate("therapist");
      onClose();
    },
  });

  function toggleDay(day: number) {
    setDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );
  }

  const failure = save.error instanceof ApiError ? save.error.message : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit therapist" : "Add therapist"}
      description={editing ? therapist.full_name : "Someone new on the roster"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="therapist-form" loading={save.isPending}>
            {editing ? "Save changes" : "Add therapist"}
          </Button>
        </>
      }
    >
      <RequiredNote />

      <form
        id="therapist-form"
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (valid) save.mutate();
        }}
      >
        <Input
          label="Full name"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          error={touched ? problems.fullName : undefined}
        />
        <Input
          label="Specialty"
          required
          placeholder="e.g. Sports injury"
          value={specialty}
          onChange={(event) => setSpecialty(event.target.value)}
          error={touched ? problems.specialty : undefined}
        />

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
          error={touched ? problems.hours : undefined}
        />

        <Select
          label="Session length"
          required
          options={SLOT_LENGTHS}
          value={slot}
          onChange={setSlot}
          hint="Decides how the calendar is cut up"
        />

        <FieldShell
          label="Working days"
          required
          className="sm:col-span-2"
          error={touched ? problems.days : undefined}
        >
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 7 }, (_, day) => {
              const on = days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "h-9 w-14 rounded-lg border text-sm transition-colors",
                    on
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-surface text-muted hover:bg-background",
                  )}
                >
                  {weekdayName(day)}
                </button>
              );
            })}
          </div>
        </FieldShell>

        {failure && (
          <p
            role="alert"
            className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2"
          >
            {failure}
          </p>
        )}
      </form>
    </Modal>
  );
}
