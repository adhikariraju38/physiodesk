"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { RequiredNote, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { ApiError, api } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { useInvalidate } from "@/lib/use-invalidate";
import type { Appointment, Page, Patient, PaymentMethod, TherapistBrief } from "@/types/api";

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

  const [patientId, setPatientId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [missingPatient, setMissingPatient] = useState(false);

  // the whole register, this is a picker rather than a paged list
  const { data: patients, isPending: patientsLoading } = useQuery({
    queryKey: keys.patients.list({ page: 1, search: "__picker__" }),
    queryFn: () => api.get<Page<Patient>>("/patients?page=1&page_size=100"),
    enabled: open,
  });

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

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!patientId) {
      setMissingPatient(true);
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

        {failure && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {failure}
          </p>
        )}
      </form>
    </Modal>
  );
}
