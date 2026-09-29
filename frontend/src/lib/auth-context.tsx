"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect } from "react";

import { Spinner } from "@/components/ui/Skeleton";
import { api, clearSessionFlag } from "@/lib/api";
import { keys } from "@/lib/query-keys";
import type { User } from "@/types/api";

type AuthValue = {
  user: User;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isError } = useQuery({
    queryKey: keys.me,
    queryFn: () => api.get<User>("/auth/me"),
    retry: false,
    staleTime: Infinity,
  });

  // the api client already leaves for the login page when a session is gone.
  // this only covers /auth/me failing for some other reason, so the shell does
  // not sit on its spinner forever.
  useEffect(() => {
    if (!isError) return;
    clearSessionFlag();
    window.location.href = "/login";
  }, [isError]);

  if (!user) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen items-center justify-center text-primary"
      >
        <Spinner className="h-8 w-8" />
        <span className="sr-only">Signing you in</span>
      </div>
    );
  }

  async function signOut() {
    try {
      await api.post("/auth/logout");
    } finally {
      clearSessionFlag();
      // a hard navigation, so no stale query cache survives into the next session
      window.location.href = "/login";
    }
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin: user.role === "admin", signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
