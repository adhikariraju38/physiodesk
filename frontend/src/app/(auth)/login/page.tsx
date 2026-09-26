"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { ApiError, api } from "@/lib/api";
import type { User } from "@/types/api";

const schema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(6, "Passwords are at least 6 characters"),
});

type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setFailure(null);
    try {
      await api.post<User>("/auth/login", values);
      router.replace("/dashboard");
    } catch (error) {
      setFailure(
        error instanceof ApiError ? error.message : "Could not reach the server, is it running?",
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl">PhysioDesk</h1>
          <p className="mt-1 text-sm text-muted">Sign in to the clinic desk</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              autoFocus
              placeholder="you@physiodesk.com"
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />

            {failure && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                {failure}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>

        <div className="mt-5 rounded-lg border border-border bg-surface/60 px-4 py-3 text-center text-xs text-muted">
          <p className="font-medium text-ink">Demo accounts</p>
          <p className="mt-1 font-mono">admin@physiodesk.com / admin123</p>
          <p className="font-mono">staff@physiodesk.com / staff123</p>
        </div>
      </div>
    </main>
  );
}
