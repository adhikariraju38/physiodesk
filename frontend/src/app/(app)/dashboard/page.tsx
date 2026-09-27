"use client";

import { useQuery } from "@tanstack/react-query";

import { CapacityStrip, CapacityStripSkeleton } from "@/components/dashboard/CapacityStrip";
import { RecentPatients } from "@/components/dashboard/RecentPatients";
import { StatCard, StatCardSkeleton } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";
import { keys } from "@/lib/query-keys";
import { formatDate, formatMoney } from "@/lib/format";
import type { DashboardSummary } from "@/types/api";

export default function DashboardPage() {
  const { data, isPending, error } = useQuery({
    queryKey: keys.dashboard.summary(6),
    queryFn: () => api.get<DashboardSummary>("/dashboard/summary?recent=6"),
  });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={data ? `Today at the clinic, ${formatDate(data.date)}` : "Today at the clinic"}
      />

      <div className="space-y-6 px-6 py-6">
        {error && (
          <p role="alert" className="rounded-card bg-danger-soft px-4 py-3 text-sm text-danger">
            {error.message}
          </p>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isPending && Array.from({ length: 4 }, (_, index) => <StatCardSkeleton key={index} />)}

          {data && (
            <>
              <StatCard
                label="Patients seen today"
                value={data.stats.patients_seen_today}
                hint="Sessions that have already started"
              />
              <StatCard
                label="Therapists on duty"
                value={data.stats.therapists_on_duty}
                hint="After day off and hour changes"
              />
              <StatCard
                label="Revenue collected today"
                value={formatMoney(data.stats.revenue_today)}
                hint="Invoices marked paid today"
              />
              <StatCard
                label="Open slots remaining"
                value={data.stats.open_slots_today}
                hint="Still bookable before closing"
              />
            </>
          )}
        </section>

        {isPending ? (
          <>
            <CapacityStripSkeleton />
            <RecentPatients patients={[]} isLoading />
          </>
        ) : (
          data && (
            <>
              <CapacityStrip capacity={data.capacity} />
              <RecentPatients patients={data.recent_patients} />
            </>
          )
        )}
      </div>
    </>
  );
}
