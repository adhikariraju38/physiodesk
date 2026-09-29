import { Sidebar } from "@/components/layout/Sidebar";
import { AuthProvider } from "@/lib/auth-context";
import { Providers } from "@/lib/providers";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AuthProvider>
        {/* the shell is exactly one viewport tall and the main column does the
            scrolling, so the sidebar never scrolls away with the content */}
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
            {children}
          </main>
        </div>
      </AuthProvider>
    </Providers>
  );
}
