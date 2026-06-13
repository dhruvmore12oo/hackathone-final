import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search, User, Layers, Activity } from "lucide-react";

import { TopBar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAuditLogs } from "@/lib/api/audit.functions";
import { formatMovementTime } from "@/lib/formatters";

export const Route = createFileRoute("/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs - FlowERP" }] }),
  component: AuditPage,
});

const actionTone: Record<string, string> = {
  Created: "bg-success/15 text-success border-success/20 text-[10px]",
  Updated: "bg-primary/15 text-primary border-primary/20 text-[10px]",
  Deleted: "bg-destructive/15 text-destructive border-destructive/20 text-[10px]",
  Confirmed: "bg-chart-5/15 text-chart-5 border-chart-5/20 text-[10px]",
  Cancelled: "bg-destructive/15 text-destructive border-destructive/20 text-[10px]",
  Started: "bg-warning/15 text-warning border-warning/20 text-[10px]",
  Completed: "bg-success/15 text-success border-success/20 text-[10px]",
  Received: "bg-success/15 text-success border-success/20 text-[10px]",
  Delivered: "bg-success/15 text-success border-success/20 text-[10px]",
  "Logged in": "bg-muted text-muted-foreground border-border text-[10px]",
};

function AuditPage() {
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const listAuditLogsFn = useServerFn(listAuditLogs);

  const auditQuery = useQuery({
    queryKey: ["audit-logs", search, moduleFilter, actionFilter],
    queryFn: () => listAuditLogsFn({
      data: {
        search: search || undefined,
        module: moduleFilter,
        action: actionFilter,
      },
    }),
  });

  const logs = auditQuery.data?.logs ?? [];
  const modules = auditQuery.data?.modules ?? ["All"];
  const actions = auditQuery.data?.actions ?? ["All"];

  return (
    <>
      <TopBar title="Audit Logs" breadcrumb="Compliance" />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Audit Logs</h2>
            <p className="text-sm text-muted-foreground">Immutable activity stream / {logs.length} events</p>
          </div>
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events..."
              className="h-8 pl-8 text-xs w-64 bg-card border-border/70"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Layers className="size-3 text-muted-foreground" />
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="h-7 w-40 text-xs bg-card border-border/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem key={m} value={m}>{m === "All" ? "Module: All" : m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="size-3 text-muted-foreground" />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-7 w-40 text-xs bg-card border-border/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>{a === "All" ? "Action: All" : a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(moduleFilter !== "All" || actionFilter !== "All" || search) && (
            <button
              onClick={() => { setModuleFilter("All"); setActionFilter("All"); setSearch(""); }}
              className="px-2.5 py-1 rounded-md text-xs border border-border/70 text-muted-foreground hover:text-foreground hover:border-border transition"
            >
              Clear filters
            </button>
          )}
        </div>

        <Card className="border-border/70 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Event</th>
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Module</th>
                <th className="px-4 py-2.5 font-medium">Target</th>
                <th className="px-4 py-2.5 font-medium text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditQuery.isLoading && Array.from({ length: 6 }).map((_, index) => (
                <tr key={index} className="border-t border-border/60">
                  <td className="px-4 py-3" colSpan={6}>
                    <div className="h-4 rounded bg-muted/60 animate-pulse" />
                  </td>
                </tr>
              ))}
              {!auditQuery.isLoading && auditQuery.isError && (
                <tr className="border-t border-border/60">
                  <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                    Audit logs could not be loaded. Check the database connection and try again.
                  </td>
                </tr>
              )}
              {!auditQuery.isLoading && !auditQuery.isError && logs.length === 0 && (
                <tr className="border-t border-border/60">
                  <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                    No audit events found.
                  </td>
                </tr>
              )}
              {!auditQuery.isLoading && !auditQuery.isError && logs.map((log) => (
                <tr key={log.id} className="border-t border-border/60 hover:bg-accent/40 transition">
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{log.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-primary/15 text-primary text-[10px] font-medium flex items-center justify-center">
                        {log.user.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                      </div>
                      <span className="text-xs">{log.user}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge className={actionTone[log.action] ?? "bg-muted text-muted-foreground border-border text-[10px]"}>{log.action}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{log.module}</td>
                  <td className="px-4 py-3 font-mono text-xs">{log.target}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground tabular-nums">{formatMovementTime(log.time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </>
  );
}
