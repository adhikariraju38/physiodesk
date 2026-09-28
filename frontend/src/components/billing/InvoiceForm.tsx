"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input, RequiredNote } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { ApiError, api } from "@/lib/api";
import { formatMoney, toDateInput } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { useInvalidate } from "@/lib/use-invalidate";
import type { Invoice, Page, Patient, PaymentMethod } from "@/types/api";

const PAYMENT_METHODS: { value: PaymentMethod | ""; label: string }[] = [
  { value: "", label: "Not recorded" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "online", label: "Online transfer" },
  { value: "insurance", label: "Insurance" },
];

const STATUSES = [
  { value: "due", label: "Due", hint: "Money still to come in" },
  { value: "paid", label: "Paid", hint: "Settled today" },
];

export function InvoiceForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const invalidate = useInvalidate();

  const [patientId, setPatientId] = useState("");
  const [service, setService] = useState("");
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [status, setStatus] = useState("due");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [issuedDate, setIssuedDate] = useState(() => toDateInput(new Date()));
  const [touched, setTouched] = useState(false);

  const { data: patients, isPending: patientsLoading } = useQuery({
    queryKey: keys.patients.list({ page: 1, search: "__picker__" }),
    queryFn: () => api.get<Page<Patient>>("/patients?page=1&page_size=100"),
    enabled: open,
  });

  const total = useMemo(() => {
    const gross = Number(amount || 0);
    const off = Number(discount || 0);
    return Number.isFinite(gross - off) ? gross - off : 0;
  }, [amount, discount]);

  const problems = {
    patient: !patientId ? "Pick who this is for" : undefined,
    service: service.trim().length < 2 ? "Describe what is being billed" : undefined,
    amount: Number(amount) > 0 ? undefined : "Enter an amount above zero",
    discount: Number(discount || 0) > Number(amount || 0) ? "More than the amount" : undefined,
  };
  const valid = Object.values(problems).every((problem) => problem === undefined);

  const create = useMutation({
    mutationFn: () =>
      api.post<Invoice>("/invoices", {
        patient_id: Number(patientId),
        service: service.trim(),
        amount: Number(amount).toFixed(2),
        discount: Number(discount || 0).toFixed(2),
        status,
        payment_method: paymentMethod || null,
        issued_date: issuedDate,
      }),
    onSuccess: async () => {
      await invalidate("invoice");
      onClose();
    },
  });

  const failure = create.error instanceof ApiError ? create.error.message : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Raise an invoice"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="invoice-form" loading={create.isPending}>
            Raise invoice
          </Button>
        </>
      }
    >
      <RequiredNote />

      <form
        id="invoice-form"
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (valid) create.mutate();
        }}
      >
        <Select
          label="Patient"
          required
          searchable
          className="sm:col-span-2"
          placeholder={patientsLoading ? "Loading patients…" : "Choose a patient"}
          disabled={patientsLoading}
          options={(patients?.items ?? []).map((patient) => ({
            value: String(patient.id),
            label: patient.full_name,
            hint: `${patient.phone} · ${patient.condition}`,
          }))}
          value={patientId}
          onChange={setPatientId}
          error={touched ? problems.patient : undefined}
        />

        <Input
          label="Service"
          required
          className="sm:col-span-2"
          placeholder="e.g. Manual therapy session"
          value={service}
          onChange={(event) => setService(event.target.value)}
          error={touched ? problems.service : undefined}
        />

        <Input
          label="Amount"
          required
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={touched ? problems.amount : undefined}
        />

        <Input
          label="Discount"
          optional
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={discount}
          onChange={(event) => setDiscount(event.target.value)}
          error={touched ? problems.discount : undefined}
        />

        <DatePicker label="Issued on" required value={issuedDate} onChange={setIssuedDate} />

        <Select label="Status" required options={STATUSES} value={status} onChange={setStatus} />

        <Select
          label="Payment method"
          optional
          className="sm:col-span-2"
          options={PAYMENT_METHODS}
          value={paymentMethod}
          onChange={setPaymentMethod}
        />

        <div className="flex items-baseline justify-between rounded-lg bg-background px-4 py-3 sm:col-span-2">
          <span className="text-sm text-muted">Total</span>
          <span className="font-mono text-lg text-ink">{formatMoney(total)}</span>
        </div>

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
