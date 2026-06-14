import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search, Download, RefreshCw, ShieldAlert, Users, Factory, Activity, 
  MoreHorizontal, Eye, ShieldCheck, ArrowRight, ArrowDownUp, Clock, Monitor, Globe, Tag
} from "lucide-react";

import { TopBar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { listAuditLogs, type AuditLogItem } from "@/lib/api/audit.functions";

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
    case "Created": return "bg-green-500/10 text-green-600 border-green-500/20";
    case "Updated": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "Deleted": return "bg-red-500/10 text-red-600 border-red-500/20";
    case "Approved": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "Rejected": return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    case "Confirmed": return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
    case "Logged in": return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
    case "Logout": return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    default: return "bg-slate-500/10 text-slate-600 border-slate-500/20";
  }
}

function getSeverityTone(severity: string) {
  switch(severity) {
    case "Critical": return "bg-red-500/10 text-red-600 border-red-500/20";
    case "High": return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    case "Medium": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "Low": return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    default: return "bg-slate-500/10 text-slate-600 border-slate-500/20";
  }
}

function getMockMetadata(id: string) {
  const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const browsers = ["Chrome 114.0", "Firefox 112.0", "Safari 16.4", "Edge 113.0"];
  const devices = ["Windows 11", "macOS Ventura", "Ubuntu 22.04", "iOS 16.5"];
  const ips = ["192.168.1.105", "10.0.0.42", "172.16.254.1", "104.28.14.99"];
  
  return {
    browser: browsers[sum % browsers.length],
    device: devices[sum % devices.length],
    ip: ips[sum % ips.length],
    status: "Completed",
  };
}

function extractChanges(description: string | null) {
  if (!description) return null;
  const match = description.match(/Changed .*? role to (.*?)\./);
  if (match) {
    return { before: "Unknown", after: match[1] };
  }
  return null;
}

function AuditPage() {
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

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

  const selectedLog = logs.find(l => l.id === selectedLogId);
  const metadata = selectedLog ? getMockMetadata(selectedLog.id) : null;
  const changes = selectedLog ? extractChanges(selectedLog.description) : null;

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
          <Card className="h-[120px] p-4 flex flex-col justify-between border-slate-200 dark:border-slate-800 shadow-sm">
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
          
          <Card className="h-[120px] p-4 flex flex-col justify-between border-slate-200 dark:border-slate-800 shadow-sm">
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

          <Card className="h-[120px] p-4 flex flex-col justify-between border-slate-200 dark:border-slate-800 shadow-sm">
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

          <Card className="h-[120px] p-4 flex flex-col justify-between border-slate-200 dark:border-slate-800 shadow-sm">
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
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input 
                placeholder="Search Event ID..." 
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
                  <th className="px-4 py-3 font-medium">Event ID</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Module</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Severity</th>
                  <th className="px-4 py-3 font-medium text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {auditQuery.isLoading && Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-4"><div className="h-6 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" /></td>
                  </tr>
                ))}
                {!auditQuery.isLoading && logs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition cursor-pointer group"
                    onClick={() => setSelectedLogId(log.id)}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-slate-300" />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 border border-slate-200 dark:border-slate-700">
                          <AvatarFallback className="bg-indigo-50 text-indigo-600 text-[10px] font-semibold dark:bg-indigo-900/30 dark:text-indigo-400">
                            {log.user.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100 text-xs">{log.user}</div>
                          <div className="text-[10px] text-slate-500">Administrator</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${getActionTone(log.action)} text-[10px] uppercase font-semibold px-2 py-0.5 rounded-sm`}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 font-medium">{log.module}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{log.target}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${getSeverityTone(log.severity)} text-[10px] uppercase font-semibold px-2 py-0.5 rounded-sm`}>
                        {log.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-xs text-slate-900 dark:text-slate-100 font-medium">{format(new Date(log.time), "dd MMM, hh:mm a")}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{formatDistanceToNow(new Date(log.time), { addSuffix: true })}</div>
                    </td>
                  </tr>
                ))}
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

      {/* SECTION 5 - AUDIT EVENT DETAILS PANEL */}
      <Sheet open={!!selectedLogId} onOpenChange={(open) => !open && setSelectedLogId(null)}>
        <SheetContent className="w-[90vw] sm:max-w-[600px] p-0 flex flex-col bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800">
          
          {selectedLog && metadata && (
            <>
              {/* Header */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Event Details</h2>
                    <p className="text-xs text-slate-500 font-mono mt-1">{selectedLog.id}</p>
                  </div>
                  <Badge className={`${getSeverityTone(selectedLog.severity)} uppercase tracking-wider text-[10px]`}>
                    {selectedLog.severity} SEVERITY
                  </Badge>
                </div>
                
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Status</div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                      <ShieldCheck className="size-4 text-green-600" /> {metadata.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Timestamp</div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {format(new Date(selectedLog.time), "dd MMM yyyy, HH:mm:ss")}
                    </div>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-8">
                  
                  {/* Event Information */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Activity className="size-4 text-slate-400" /> Event Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Action</div>
                        <Badge className={`${getActionTone(selectedLog.action)} text-[10px]`}>{selectedLog.action}</Badge>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Module</div>
                        <div className="text-sm font-medium">{selectedLog.module}</div>
                      </div>
                    </div>
                    {selectedLog.description && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Description</div>
                        <div className="text-sm text-slate-700 dark:text-slate-300">{selectedLog.description}</div>
                      </div>
                    )}
                  </section>

                  {/* Actor & Target Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <section className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <User className="size-4 text-slate-400" /> Actor
                      </h3>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                        <Avatar className="size-10 border border-slate-200 dark:border-slate-700">
                          <AvatarFallback className="bg-indigo-50 text-indigo-600 text-xs font-semibold dark:bg-indigo-900/30 dark:text-indigo-400">
                            {selectedLog.user.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{selectedLog.user}</div>
                          <div className="text-xs text-slate-500">Administrator</div>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Tag className="size-4 text-slate-400" /> Target
                      </h3>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">Affected Record</div>
                        <div className="font-mono text-sm font-medium text-indigo-600 dark:text-indigo-400 break-all">
                          {selectedLog.target}
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Change History */}
                  {changes && (
                    <section className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <ArrowDownUp className="size-4 text-slate-400" /> Change History
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border border-red-100 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/20">
                          <div className="text-[10px] text-red-600/70 uppercase tracking-wider mb-2 font-medium">Before Value</div>
                          <div className="text-sm text-red-700 dark:text-red-400 line-through decoration-red-300">{changes.before}</div>
                        </div>
                        <div className="p-4 rounded-lg border border-green-100 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/20">
                          <div className="text-[10px] text-green-600/70 uppercase tracking-wider mb-2 font-medium">After Value</div>
                          <div className="text-sm text-green-700 dark:text-green-400">{changes.after}</div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* System Metadata */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Monitor className="size-4 text-slate-400" /> System Metadata
                    </h3>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Globe className="size-3" /> IP Address</div>
                        <div className="text-sm font-mono text-slate-700 dark:text-slate-300">{metadata.ip}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Monitor className="size-3" /> Device</div>
                        <div className="text-sm text-slate-700 dark:text-slate-300">{metadata.device}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Browser</div>
                        <div className="text-sm text-slate-700 dark:text-slate-300">{metadata.browser}</div>
                      </div>
                    </div>
                  </section>

                  {/* Activity Timeline */}
                  <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Clock className="size-4 text-slate-400" /> Event Timeline
                    </h3>
                    <div className="relative pl-6 space-y-6 before:absolute before:inset-y-1 before:left-[11px] before:w-px before:bg-slate-200 dark:before:bg-slate-800">
                      
                      <div className="relative">
                        <div className="absolute -left-[29px] top-1 size-3 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-950" />
                        <div className="text-[10px] text-slate-500 font-medium mb-1">{format(new Date(new Date(selectedLog.time).getTime() - 120000), "hh:mm a")}</div>
                        <div className="text-sm text-slate-700 dark:text-slate-300">User Initiated Action</div>
                      </div>

                      {selectedLog.action !== "Logged in" && (
                        <div className="relative">
                          <div className="absolute -left-[29px] top-1 size-3 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-950" />
                          <div className="text-[10px] text-slate-500 font-medium mb-1">{format(new Date(new Date(selectedLog.time).getTime() - 60000), "hh:mm a")}</div>
                          <div className="text-sm text-slate-700 dark:text-slate-300">System Validation Passed</div>
                        </div>
                      )}

                      <div className="relative">
                        <div className="absolute -left-[29px] top-1 size-3 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-950" />
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mb-1">{format(new Date(selectedLog.time), "hh:mm a")}</div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Event Logged: {selectedLog.action}</div>
                      </div>

                    </div>
                  </section>

                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
