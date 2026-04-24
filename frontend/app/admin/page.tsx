"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";

type Stats = {
  tickets: { open: number; inProgress: number; resolved: number; closed: number };
  totalUsers: number;
  agentsOnline: number;
};

type Agent = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isOnline: boolean;
  activeChats: number;
};

type AuditEntry = {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export default function AdminDashboard() {
  const { loading } = useAuth("ADMIN");
  const [stats, setStats] = useState<Stats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      const [s, a, l] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/agents"),
        api.get("/admin/audit?limit=50"),
      ]);
      setStats(s.data);
      setAgents(a.data);
      setAudit(l.data);
    } catch {
      setError("Failed to load admin data");
    }
  };

  useEffect(() => {
    if (loading) return;
    fetchAll();
    const t = setInterval(fetchAll, 10000);
    return () => clearInterval(t);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  const actionStyle = (action: string) => {
    if (action.includes("LOGIN")) return "bg-emerald-100 text-emerald-800";
    if (action.includes("LOGOUT")) return "bg-slate-200 text-slate-700";
    if (action.includes("RESOLVED")) return "bg-indigo-100 text-indigo-800";
    if (action.includes("CLOSED")) return "bg-rose-100 text-rose-800";
    if (action.includes("ASSIGNED")) return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <AppShell
      title="Admin Dashboard"
      subtitle="System overview & activity"
      actions={
        <button
          onClick={fetchAll}
          className="text-sm px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
        >
          Refresh
        </button>
      }
    >
      {error && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <StatCard label="Open" value={stats.tickets.open} color="blue" />
          <StatCard
            label="In progress"
            value={stats.tickets.inProgress}
            color="amber"
          />
          <StatCard
            label="Resolved"
            value={stats.tickets.resolved}
            color="emerald"
          />
          <StatCard
            label="Closed"
            value={stats.tickets.closed}
            color="slate"
          />
          <StatCard label="Users" value={stats.totalUsers} color="indigo" />
          <StatCard
            label="Agents online"
            value={stats.agentsOnline}
            color="violet"
          />
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Agents
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Name</th>
                <th className="text-left px-4 py-2.5 font-medium">Email</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">
                  Active chats
                </th>
                <th className="text-left px-4 py-2.5 font-medium">Enabled</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(a => (
                <tr
                  key={a.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-2.5 text-slate-900 font-medium">
                    {a.name}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{a.email}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          a.isOnline ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                      <span className="text-slate-700">
                        {a.isOnline ? "Online" : "Offline"}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {a.activeChats}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {a.isActive ? "Yes" : "No"}
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No agents
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Recent activity
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">When</th>
                <th className="text-left px-4 py-2.5 font-medium">Action</th>
                <th className="text-left px-4 py-2.5 font-medium">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {audit.map(e => (
                <tr
                  key={e.id}
                  className="border-t border-slate-100 align-top hover:bg-slate-50"
                >
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${actionStyle(
                        e.action,
                      )}`}
                    >
                      {e.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600 break-all">
                    {e.metadata ? JSON.stringify(e.metadata) : "-"}
                  </td>
                </tr>
              ))}
              {audit.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No activity yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "amber" | "emerald" | "slate" | "indigo" | "violet";
}) {
  const styles: Record<string, string> = {
    blue: "from-blue-50 to-blue-100 border-blue-200 text-blue-900",
    amber: "from-amber-50 to-amber-100 border-amber-200 text-amber-900",
    emerald:
      "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-900",
    slate: "from-slate-50 to-slate-100 border-slate-200 text-slate-900",
    indigo: "from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-900",
    violet: "from-violet-50 to-violet-100 border-violet-200 text-violet-900",
  };
  return (
    <div
      className={`bg-gradient-to-br ${styles[color]} border rounded-xl p-4 shadow-sm`}
    >
      <div className="text-xs font-medium opacity-70">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
