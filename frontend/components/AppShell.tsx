"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";

export default function AppShell({
  title,
  subtitle,
  actions,
  children,
  showLogout = true,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  showLogout?: boolean;
}) {
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("customer_conversation_id");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            {showLogout && (
              <button
                onClick={logout}
                className="text-sm px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
