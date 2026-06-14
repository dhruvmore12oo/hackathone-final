import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search, Download, RefreshCw, ShieldAlert, Users, Factory, Activity, 
  ShieldCheck, ArrowRight, Clock, Tag, Briefcase, ShoppingCart, ClipboardList, Boxes
} from "lucide-react";

import { TopBar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { listAuditLogs } from "@/lib/api/audit.functions";

export const Route = createFileRoute("/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Center - FlowERP Compliance" }] }),
  component: AuditPage,
});

function getSeverity(action: string, module: string) {
  if (["Deleted", "Cancelled", "Rejected"].includes(action)) return "Critical";
  if (module === "System Admin" && action === "Updated") return "High";
  if (["Updated", "Started"].includes(action)) return "Medium";
  return "Low";
}

function getActionTone(action: string) {
  switch(action) {
    case "Created": return "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400";
    case "Updated": return "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400";
    case "Deleted": return "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400";
    case "Approved": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400";
    case "Rejected": return "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400";
    case "Confirmed": return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400";
    case "Logged in": return "bg-teal-500/10 text-teal-600 border-teal-500/20 dark:text-teal-400";
    case "Logout": return "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400";
    default: return "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400";
  }
}

function getRoleBadge(role: string) {
  switch(role) {
    case "ADMIN":
      return "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400";
    case "BUSINESS_OWNER":
      return "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400";
    case "SALES_USER":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400";
    case "PURCHASE_USER":
      return "bg-teal-500/10 text-teal-600 border-teal-500/20 dark:text-teal-400";
    case "MANUFACTURING_USER":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400";
    case "INVENTORY_MANAGER":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400";
    default:
      return "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400";
  }
}

function getRoleLabel(role: string) {
  switch(role) {
    case "ADMIN": return "Admin";
    case "BUSINESS_OWNER": return "Owner";
    case "SALES_USER": return "Sales Manager";
    case "PURCHASE_USER": return "Purchase Manager";
    case "MANUFACTURING_USER": return "Mfg Operator";
    case "INVENTORY_MANAGER": return "Inventory Mgr";
    default: return role;
  }
}

function getRoleIcon(role: string) {
  switch(role) {
    case "ADMIN": return ShieldAlert;
    case "BUSINESS_OWNER": return Briefcase;
    case "SALES_USER": return ShoppingCart;
    case "PURCHASE_USER": return ClipboardList;
    case "MANUFACTURING_USER": return Factory;
    case "INVENTORY_MANAGER": return Boxes;
    default: return Users;
  }
}

function AuditPage() {
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");

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

  const rawLogs = auditQuery.data?.logs ?? [];
  const modules = auditQuery.data?.modules ?? ["All"];
  const actions = auditQuery.data?.actions ?? ["All"];

  // Client-side derive severity and filter
  const logs = useMemo(() => {
    return rawLogs
      .map(log => ({ ...log, severity: getSeverity(log.action, log.module) }))
      .filter(log => severityFilter === "All" || log.severity === severityFilter);
  }, [rawLogs, severityFilter]);

  const todayEventsCount = logs.filter(l => new Date(l.time) > new Date(new Date().setHours(0,0,0,0))).length;
  const criticalCount = logs.filter(l => l.severity === "Critical").length;
  const userActionsCount = logs.filter(l => l.module === "Users" || l.module === "System Admin").length;
  const mfgActionsCount = logs.filter(l => l.module === "Manufacturing").length;

  return (
    <>
      <TopBar title="Audit Logs" breadcrumb="Compliance" />
      <main className="p-6 space-y-6 max-w-[1920px] w-full mx-auto">
        
        {/* SECTION 1 - HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Audit Center</h1>
            <p className="text-sm text-slate-500 mt-1">Track all system activities, changes, and compliance events.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-8 gap-2 text-xs">
              <Clock className="size-4" /> Last 30 Days
            </Button>
            <Button variant="outline" className="h-8 gap-2 text-xs">
              <Download className="size-4" /> Export Logs
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => auditQuery.refetch()}>
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>

        {/* SECTION 2 - AUDIT OVERVIEW CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="h-[120px] p-4 flex flex-col justify-between border-slate-200 dark:border-slate-800 shadow-sm bg-card">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Events Today</span>
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-md">
                <Activity className="size-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-semibold">{todayEventsCount}</span>
              <span className="text-xs text-green-600 font-medium mb-1 flex items-center"><ArrowRight className="size-3 -rotate-45 mr-1" /> 12%</span>
            </div>
          </Card>
          
          <Card className="h-[120px] p-4 flex flex-col justify-between border-slate-200 dark:border-slate-800 shadow-sm bg-card">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Critical Events</span>
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
                <ShieldAlert className="size-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-semibold">{criticalCount}</span>
              <span className="text-xs text-slate-500 font-medium mb-1 flex items-center">In last 30 days</span>
            </div>
          </Card>

          <Card className="h-[120px] p-4 flex flex-col justify-between border-slate-200 dark:border-slate-800 shadow-sm bg-card">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">User Management</span>
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                <Users className="size-4 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-semibold">{userActionsCount}</span>
              <span className="text-xs text-slate-500 font-medium mb-1 flex items-center">Events recorded</span>
            </div>
          </Card>

          <Card className="h-[120px] p-4 flex flex-col justify-between border-slate-200 dark:border-slate-800 shadow-sm bg-card">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Manufacturing Activity</span>
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                <Factory className="size-4 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-semibold">{mfgActionsCount}</span>
              <span className="text-xs text-green-600 font-medium mb-1 flex items-center"><ArrowRight className="size-3 -rotate-45 mr-1" /> 4%</span>
            </div>
          </Card>
        </div>

        {/* SECTION 3 & 4 - TABLE AND FILTERS */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col bg-card">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input 
                placeholder="Search description, target ID..." 
                className="pl-9 h-8 w-64 text-xs bg-white dark:bg-slate-950" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="h-8 w-40 text-xs bg-white dark:bg-slate-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem key={m} value={m}>{m === "All" ? "All Modules" : m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-8 w-40 text-xs bg-white dark:bg-slate-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>{a === "All" ? "All Actions" : a}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-8 w-40 text-xs bg-white dark:bg-slate-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Severities</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>

            {(moduleFilter !== "All" || actionFilter !== "All" || search || severityFilter !== "All") && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs text-slate-500"
                onClick={() => { setModuleFilter("All"); setActionFilter("All"); setSeverityFilter("All"); setSearch(""); }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <tr className="text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-medium w-8"><input type="checkbox" className="rounded border-slate-300" /></th>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Action Performed</th>
                  <th className="px-4 py-3 font-medium">Affected Module</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {auditQuery.isLoading && Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-4"><div className="h-6 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" /></td>
                  </tr>
                ))}
                {!auditQuery.isLoading && logs.map((log) => {
                  const RoleIcon = getRoleIcon(log.userRole);
                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition select-text"
                    >
                      <td className="px-4 py-3">
                        <input type="checkbox" className="rounded border-slate-300" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-slate-900 dark:text-slate-100 font-semibold">{format(new Date(log.time), "dd MMM yyyy")}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{format(new Date(log.time), "hh:mm a")} ({formatDistanceToNow(new Date(log.time), { addSuffix: true })})</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-semibold dark:bg-primary/10">
                              {log.user.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{log.user}</div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <RoleIcon className="size-3 text-muted-foreground" />
                              <span className={`text-[9px] font-medium border px-1 rounded-sm ${getRoleBadge(log.userRole)}`}>
                                {getRoleLabel(log.userRole)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={`${getActionTone(log.action)} text-[10px] uppercase font-bold border px-2 py-0.5 rounded-md`}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                          <Tag className="size-3 text-muted-foreground" />
                          <span>{log.module}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.severity === "Critical" ? (
                          <div className="flex items-center gap-1 text-xs text-red-500 font-semibold">
                            <ShieldAlert className="size-3.5" />
                            <span>Warning</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                            <ShieldCheck className="size-3.5" />
                            <span>Success</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-600 dark:text-slate-400 leading-normal block max-w-lg">
                          {log.description ?? <span className="text-slate-400 italic">No description details available</span>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
            <div>Showing {logs.length} of {rawLogs.length} events</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled>Previous</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled>Next</Button>
            </div>
          </div>
        </Card>
      </main>
    </>
  );
}
