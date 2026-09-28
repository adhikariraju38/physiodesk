"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { RequiredNote, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { ApiError, api } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { useInvalidate } from "@/lib/use-invalidate";
import { queryString } from "@/lib/api";
import type {
  Appointment,
  DaySchedule,
  Page,
  Patient,
  PaymentMethod,
  TherapistBrief,
} from "@/types/api";

const PAYMENT_METHODS: { value: PaymentMethod | ""; label: string }[] = [
  { value: "", label: "Decide later" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "online", label: "Online transfer" },
  { value: "insurance", label: "Insurance" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  therapist: TherapistBrief;
  date: string;
  startTime: string;
  endTime: string;
};

export function BookingModal({ open, onClose, therapist, date, startTime, endTime }: Props) {
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();

  const [patientId, setPatientId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [missingPatient, setMissingPatient] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);

  // the whole register, this is a picker rather than a paged list
  const { data: patients, isPending: patientsLoading } = useQuery({
    queryKey: keys.patients.list({ page: 1, search: "__picker__" }),
    queryFn: () => api.get<Page<Patient>>("/patients?page=1&page_size=100"),
    enabled: open,
  });

  // the patient may already be in with someone else at another time that day.
  // the api allows it, a receptionist usually wants to know first.
  const { data: sameDay } = useQuery({
    queryKey: keys.appointments.forPatient(Number(patientId)),
    queryFn: () =>
      api.get<Appointment[]>(
        `/appointments${queryString({ patient_id: patientId, date_from: date, date_to: date })}`,
      ),
    enabled: open && Boolean(patientId),
  });

  const clashesElsewhere = (sameDay ?? []).filter((row) => row.status !== "cancelled");

  /** Re-read the day before writing, in case someone took the slot meanwhile. */
  async function slotStillFree(): Promise<boolean> {
    const fresh = await queryClient.fetchQuery({
      queryKey: keys.schedule.day(date),
      queryFn: () => api.get<DaySchedule>(`/schedule?date=${date}`),
      staleTime: 0,
    });

    const column = fresh.therapists.find((row) => row.therapist.id === therapist.id);
    const slot = column?.slots.find((row) => row.start_time === startTime);
    return Boolean(slot && !slot.is_booked);
  }

  const book = useMutation({
    mutationFn: () =>
      api.post<Appointment>("/appointments", {
        patient_id: Number(patientId),
        therapist_id: therapist.id,
        appt_date: date,
        start_time: startTime,
        payment_method: paymentMethod || null,
        notes: notes.trim() || null,
      }),
    onSuccess: async () => {
      await invalidate("appointment");
      onClose();
    },
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setConflict(null);

    if (!patientId) {
      setMissingPatient(true);
      return;
    }

    if (!(await slotStillFree())) {
      setConflict(
        `${therapist.full_name} was booked at ${formatTime(startTime)} while this form was open. Close this and pick another slot.`,
      );
      await invalidate("appointment");
      return;
    }

    book.mutate();
  }

  const failure = book.error instanceof ApiError ? book.error.message : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Book appointment"
      description={`${therapist.full_name} · ${formatDate(date)} · ${formatTime(startTime)} to ${formatTime(endTime)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={book.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="booking-form" loading={book.isPending}>
            Book appointment
          </Button>
        </>
      }
    >
      <RequiredNote />

      <form id="booking-form" onSubmit={submit} className="mt-4 space-y-4">
        <Select
          label="Patient"
          required
          searchable
          placeholder={patientsLoading ? "Loading patients…" : "Choose a patient"}
          disabled={patientsLoading}
          options={(patients?.items ?? []).map((patient) => ({
            value: String(patient.id),
            label: patient.full_name,
            hint: `${patient.phone} · ${patient.condition}`,
          }))}
          value={patientId}
          onChange={(next) => {
            setPatientId(next);
            setMissingPatient(false);
          }}
          error={missingPatient ? "Pick who the appointment is for" : undefined}
        />

        <Select
          label="Payment method"
          optional
          options={PAYMENT_METHODS}
          value={paymentMethod}
          onChange={setPaymentMethod}
        />

        <Textarea
          label="Notes"
          optional
          placeholder="Anything the therapist should know before the session"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        {clashesElsewhere.length > 0 && (
          <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-ink">
            Already booked that day at{" "}
            {clashesElsewhere.map((row) => formatTime(row.start_time)).join(", ")} with{" "}
            {clashesElsewhere.map((row) => row.therapist.full_name).join(", ")}. You can still go
            ahead.
          </p>
        )}

        {(conflict ?? failure) && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {conflict ?? failure}
          </p>
        )}
      </form>
    </Modal>
  );
}
