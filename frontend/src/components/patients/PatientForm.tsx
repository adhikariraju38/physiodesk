"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Input, RequiredNote, Textarea } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ApiError, api } from "@/lib/api";
import { keys } from "@/lib/query-keys";
import { useInvalidate } from "@/lib/use-invalidate";
import type { Patient, Therapist } from "@/types/api";

const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "active", label: "Active", hint: "Currently under treatment" },
  { value: "completed", label: "Completed", hint: "Course of treatment finished" },
  { value: "on_hold", label: "On hold", hint: "Paused for now" },
];

const schema = z.object({
  full_name: z.string().min(2, "Please give a full name").max(120),
  phone: z.string().min(6, "That phone number looks too short").max(32),
  age: z.coerce.number().int().min(0).max(120),
  gender: z.enum(["male", "female", "other"]),
  address: z.string().max(255),
  condition: z.string().min(2, "What are they being treated for?").max(160),
  package: z.string().max(80),
  // selects hand back strings, the empty one means nobody is assigned
  assigned_therapist_id: z.string(),
  status: z.enum(["active", "completed", "on_hold"]),
});

type Values = z.input<typeof schema>;

function defaults(patient?: Patient): Values {
  return {
    full_name: patient?.full_name ?? "",
    phone: patient?.phone ?? "",
    age: patient?.age ?? 30,
    gender: patient?.gender ?? "female",
    address: patient?.address ?? "",
    condition: patient?.condition ?? "",
    package: patient?.package ?? "",
    assigned_therapist_id: patient?.assigned_therapist ? String(patient.assigned_therapist.id) : "",
    status: patient?.status ?? "active",
  };
}

export function PatientForm({
  open,
  onClose,
  patient,
}: {
  open: boolean;
  onClose: () => void;
  patient?: Patient;
}) {
  const invalidate = useInvalidate();
  const editing = patient !== undefined;

  const { data: therapists, isPending: therapistsLoading } = useQuery({
    queryKey: keys.therapists.list(true),
    queryFn: () => api.get<Therapist[]>("/therapists?active=true"),
    enabled: open,
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults(patient),
  });

  const save = useMutation({
    mutationFn: (values: Values) => {
      const parsed = schema.parse(values);
      const payload = {
        ...parsed,
        address: parsed.address || null,
        package: parsed.package || null,
        assigned_therapist_id: parsed.assigned_therapist_id
          ? Number(parsed.assigned_therapist_id)
          : null,
      };

      return editing
        ? api.patch<Patient>(`/patients/${patient.id}`, payload)
        : api.post<Patient>("/patients", payload);
    },
    onSuccess: async () => {
      // the register, the profile, the session lists and the dashboard all
      // show something about this patient
      await invalidate("patient");
      onClose();
    },
  });

  const failure = save.error instanceof ApiError ? save.error.message : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit patient" : "Add patient"}
      description={editing ? patient.full_name : "A new entry on the clinic register"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="patient-form" disabled={save.isPending}>
            {save.isPending ? "Saving…" : editing ? "Save changes" : "Add patient"}
          </Button>
        </>
      }
    >
      <RequiredNote />

      <form
        id="patient-form"
        onSubmit={handleSubmit((values) => save.mutate(values))}
        className="mt-4 grid gap-4 sm:grid-cols-2"
        noValidate
      >
        <Input
          label="Full name"
          required
          error={errors.full_name?.message}
          {...register("full_name")}
        />
        <Input label="Phone" required error={errors.phone?.message} {...register("phone")} />

        <Input
          label="Age"
          type="number"
          min={0}
          max={120}
          required
          error={errors.age?.message}
          {...register("age")}
        />

        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <Select
              label="Gender"
              required
              options={GENDERS}
              value={field.value}
              onChange={field.onChange}
              error={errors.gender?.message}
            />
          )}
        />

        <Input
          label="Condition"
          required
          className="sm:col-span-2"
          placeholder="What are they being treated for?"
          error={errors.condition?.message}
          {...register("condition")}
        />

        <Controller
          control={control}
          name="assigned_therapist_id"
          render={({ field }) => (
            <Select
              label="Assigned therapist"
              optional
              placeholder={therapistsLoading ? "Loading therapists\u2026" : "Not assigned yet"}
              disabled={therapistsLoading}
              options={[
                { value: "", label: "Not assigned yet" },
                ...(therapists ?? []).map((therapist) => ({
                  value: String(therapist.id),
                  label: therapist.full_name,
                  hint: therapist.specialty,
                })),
              ]}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <Input
          label="Package"
          optional
          placeholder="e.g. 10 sessions"
          error={errors.package?.message}
          {...register("package")}
        />

        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select
              label="Status"
              required
              options={STATUSES}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <Textarea
          label="Address"
          optional
          className="sm:col-span-2"
          error={errors.address?.message}
          {...register("address")}
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
    </Modal>
  );
}
