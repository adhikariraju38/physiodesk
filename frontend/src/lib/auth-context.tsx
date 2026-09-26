"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";

import { api } from "@/lib/api";
import type { User } from "@/types/api";

type AuthValue = {
  user: User;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const { data: user, isError } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<User>("/auth/me"),
    retry: false,
    staleTime: Infinity,
  });

  // the api is the source of truth. if it will not tell us who we are, the
  // cookie the middleware saw is stale.
  useEffect(() => {
    if (isError) router.replace("/login");
  }, [isError, router]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  async function signOut() {
    try {
      await api.post("/auth/logout");
    } finally {
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
