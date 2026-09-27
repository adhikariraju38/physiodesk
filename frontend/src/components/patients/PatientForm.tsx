"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ApiError, api } from "@/lib/api";
import type { Patient, Therapist } from "@/types/api";

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
  const queryClient = useQueryClient();
  const editing = patient !== undefined;

  const { data: therapists } = useQuery({
    queryKey: ["therapists", { active: true }],
    queryFn: () => api.get<Therapist[]>("/therapists?active=true"),
    enabled: open,
  });

  const {
    register,
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
    onSuccess: () => {
      // the register, the profile and the dashboard all show this patient
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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
      <form
        id="patient-form"
        onSubmit={handleSubmit((values) => save.mutate(values))}
        className="grid gap-4 sm:grid-cols-2"
        noValidate
      >
        <Input label="Full name" error={errors.full_name?.message} {...register("full_name")} />
        <Input label="Phone" error={errors.phone?.message} {...register("phone")} />

        <Input
          label="Age"
          type="number"
          min={0}
          max={120}
          error={errors.age?.message}
          {...register("age")}
        />
        <Select label="Gender" error={errors.gender?.message} {...register("gender")}>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </Select>

        <Input
          label="Condition"
          className="sm:col-span-2"
          error={errors.condition?.message}
          {...register("condition")}
        />

        <Select label="Assigned therapist" {...register("assigned_therapist_id")}>
          <option value="">Not assigned yet</option>
          {therapists?.map((therapist) => (
            <option key={therapist.id} value={therapist.id}>
              {therapist.full_name}
            </option>
          ))}
        </Select>

        <Input
          label="Package"
          placeholder="e.g. 10 sessions"
          error={errors.package?.message}
          {...register("package")}
        />

        <Select label="Status" {...register("status")}>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On hold</option>
        </Select>

        <Textarea
          label="Address"
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
