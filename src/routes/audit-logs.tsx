import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, User, Calendar, Layers, Activity } from "lucide-react";
import { auditLogs } from "@/lib/mock-data";

export const Route = createFileRoute("/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs · FlowERP" }] }),
  component: AuditPage,
});

const actionTone: Record<string, string> = {
  Created: "bg-success/15 text-success border-success/20 text-[10px]",
  Updated: "bg-primary/15 text-primary border-primary/20 text-[10px]",
  Deleted: "bg-destructive/15 text-destructive border-destructive/20 text-[10px]",
  Confirmed: "bg-chart-5/15 text-chart-5 border-chart-5/20 text-[10px]",
  "Logged in": "bg-muted text-muted-foreground border-border text-[10px]",
};

function AuditPage() {
  return (
    <>
      <TopBar title="Audit Logs" breadcrumb="Compliance" />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Audit Logs</h2>
            <p className="text-sm text-muted-foreground">Tamper-proof activity stream · SOC2 ready</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="Search events…" className="h-8 pl-8 text-xs w-64 bg-card border-border/70" />
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"><Filter className="size-3.5" /> Filter</Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { icon: User, label: "User: All" },
            { icon: Layers, label: "Module: All" },
            { icon: Activity, label: "Action: All" },
            { icon: Calendar, label: "Last 7 days" },
          ].map((f) => (
            <button key={f.label} className="px-2.5 py-1 rounded-md text-xs border border-border/70 text-muted-foreground hover:text-foreground hover:border-border flex items-center gap-1.5 transition">
              <f.icon className="size-3" /> {f.label}
            </button>
          ))}
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
              {auditLogs.map((l) => (
                <tr key={l.id} className="border-t border-border/60 hover:bg-accent/40 transition">
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{l.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-primary/15 text-primary text-[10px] font-medium flex items-center justify-center">
                        {l.user.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                      </div>
                      <span className="text-xs">{l.user}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge className={actionTone[l.action]}>{l.action}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{l.module}</td>
                  <td className="px-4 py-3 font-mono text-xs">{l.target}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground tabular-nums">{l.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </>
  );
}
