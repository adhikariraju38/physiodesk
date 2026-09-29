"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Textarea } from "@/components/ui/Field";
import { KeyValue } from "@/components/ui/KeyValue";
import { Modal } from "@/components/ui/Modal";
import { StatusPill } from "@/components/ui/Pill";
import { Select } from "@/components/ui/Select";
import { LoadingPanel } from "@/components/ui/Skeleton";
import { ApiError, api } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { useInvalidate } from "@/lib/use-invalidate";
import type { Appointment, DaySchedule } from "@/types/api";

type Props = {
  open: boolean;
  onClose: () => void;
  appointmentId: number;
};

export function AppointmentModal({ open, onClose, appointmentId }: Props) {
  const invalidate = useInvalidate();
  const [moving, setMoving] = useState(false);

  const { data: appointment, isPending } = useQuery({
    queryKey: keys.appointments.detail(appointmentId),
    queryFn: () => api.get<Appointment>(`/appointments/${appointmentId}`),
    enabled: open,
  });

  const [newDate, setNewDate] = useState<string | null>(null);
  const [newStart, setNewStart] = useState("");
  const date = newDate ?? appointment?.appt_date ?? "";

  // the slots this therapist has free on the chosen day, plus the one they are
  // sitting in already so moving the time only is possible
  const { data: schedule, isPending: slotsLoading } = useQuery({
    queryKey: keys.schedule.day(date),
    queryFn: () => api.get<DaySchedule>(`/schedule?date=${date}`),
    enabled: open && moving && Boolean(date),
  });

  const column = schedule?.therapists.find((row) => row.therapist.id === appointment?.therapist.id);
  const freeSlots = (column?.slots ?? []).filter(
    (slot) => !slot.is_booked || slot.appointment?.id === appointmentId,
  );

  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.patch<Appointment>(`/appointments/${appointmentId}`, body),
    onSuccess: async () => {
      await invalidate("appointment");
      setMoving(false);
      onClose();
    },
  });

  const cancel = useMutation({
    mutationFn: () => api.delete(`/appointments/${appointmentId}`),
    onSuccess: async () => {
      await invalidate("appointment");
      onClose();
    },
  });

  const failure =
    update.error instanceof ApiError
      ? update.error.message
      : cancel.error instanceof ApiError
        ? cancel.error.message
        : null;

  const busy = update.isPending || cancel.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={moving ? "Move appointment" : "Appointment"}
      description={appointment?.patient.full_name}
      footer={
        appointment && (
          <ActionRow
            moving={moving}
            busy={busy}
            status={appointment.status}
            canConfirm={Boolean(newStart)}
            onBack={() => setMoving(false)}
            onMove={() => setMoving(true)}
            onClose={onClose}
            onCancel={() => cancel.mutate()}
            onComplete={() => update.mutate({ status: "completed" })}
            onConfirm={() => update.mutate({ appt_date: date, start_time: newStart })}
          />
        )
      }
    >
      {isPending || !appointment ? (
        <LoadingPanel label="Loading the appointment" />
      ) : moving ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Moving {appointment.patient.full_name} with {appointment.therapist.full_name}. Only
            slots they actually work are offered.
          </p>

          <DatePicker
            label="New date"
            required
            value={date}
            onChange={(next) => {
              setNewDate(next);
              setNewStart("");
            }}
          />

          <Select
            label="New time"
            required
            placeholder={slotsLoading ? "Checking availability…" : "Choose a free slot"}
            disabled={slotsLoading}
            options={freeSlots.map((slot) => ({
              value: slot.start_time,
              label: `${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}`,
              hint: slot.appointment?.id === appointmentId ? "Where it is now" : undefined,
            }))}
            value={newStart}
            onChange={setNewStart}
            hint={
              !slotsLoading && freeSlots.length === 0
                ? "Nothing free that day, try another date"
                : undefined
            }
          />

          {failure && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {failure}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <KeyValue label="Patient">
              {appointment.patient.full_name}
              <span className="block font-mono text-xs text-muted">
                {appointment.patient.phone}
              </span>
            </KeyValue>
            <KeyValue label="Therapist">
              {appointment.therapist.full_name}
              <span className="block text-xs text-muted">{appointment.therapist.specialty}</span>
            </KeyValue>
            <KeyValue label="When">
              {formatDate(appointment.appt_date)}
              <span className="block font-mono text-xs text-muted">
                {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
              </span>
            </KeyValue>
            <KeyValue label="Status">
              <StatusPill status={appointment.status} />
            </KeyValue>
            <KeyValue label="Payment">
              {appointment.payment_method ?? <span className="text-muted">Not recorded</span>}
            </KeyValue>
          </dl>

          <Textarea
            label="Notes"
            optional
            defaultValue={appointment.notes ?? ""}
            onBlur={(event) => {
              const next = event.target.value.trim() || null;
              if (next !== (appointment.notes ?? null)) update.mutate({ notes: next });
            }}
            hint="Saved when you click away"
          />

          {failure && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {failure}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function ActionRow({
  moving,
  busy,
  status,
  canConfirm,
  onBack,
  onMove,
  onClose,
  onCancel,
  onComplete,
  onConfirm,
}: {
  moving: boolean;
  busy: boolean;
  status: Appointment["status"];
  canConfirm: boolean;
  onBack: () => void;
  onMove: () => void;
  onClose: () => void;
  onCancel: () => void;
  onComplete: () => void;
  onConfirm: () => void;
}) {
  if (moving) {
    return (
      <>
        <Button variant="secondary" onClick={onBack} disabled={busy}>
          Back
        </Button>
        <Button onClick={onConfirm} loading={busy} disabled={!canConfirm}>
          Move appointment
        </Button>
      </>
    );
  }

  const settled = status === "cancelled" || status === "completed";

  return (
    <>
      <Button variant="secondary" onClick={onClose} disabled={busy}>
        Close
      </Button>
      {!settled && (
        <>
          <Button variant="destructive" onClick={onCancel} loading={busy}>
            Cancel appointment
          </Button>
          <Button variant="secondary" onClick={onMove} disabled={busy}>
            Reschedule
          </Button>
          <Button onClick={onComplete} loading={busy}>
            Mark completed
          </Button>
        </>
      )}
    </>
  );
}
