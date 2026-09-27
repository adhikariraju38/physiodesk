"use client";

import { create } from "zustand";

import { toDateInput } from "@/lib/format";

/**
 * The bits of screen state that should survive navigating away and back.
 *
 * Server data lives in react query, so this holds only what the user has set on
 * the page: which day the calendar is showing and how the patient list is
 * filtered. Walking from the schedule to a patient and back should not silently
 * reset either of them.
 */
type UiState = {
  scheduleDate: string;
  setScheduleDate: (date: string) => void;

  patientSearch: string;
  patientStatus: string;
  setPatientFilters: (filters: { search?: string; status?: string }) => void;

  invoiceStatus: string;
  setInvoiceStatus: (status: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  scheduleDate: toDateInput(new Date()),
  setScheduleDate: (scheduleDate) => set({ scheduleDate }),

  patientSearch: "",
  patientStatus: "",
  setPatientFilters: (filters) =>
    set((state) => ({
      patientSearch: filters.search ?? state.patientSearch,
      patientStatus: filters.status ?? state.patientStatus,
    })),

  invoiceStatus: "",
  setInvoiceStatus: (invoiceStatus) => set({ invoiceStatus }),
}));
