import { Sidebar } from "@/components/layout/Sidebar";
import { AuthProvider } from "@/lib/auth-context";
import { Providers } from "@/lib/providers";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AuthProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </AuthProvider>
    </Providers>
  );
}
