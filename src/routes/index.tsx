import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Factory,
  PackageX,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Truck,
  Wallet,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { TopBar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDashboardSummary } from "@/lib/api/dashboard.functions";
import { getCurrentUserProfile } from "@/lib/api/auth.functions";
import { formatINR, formatMovementTime } from "@/lib/formatters";
import { useAuth } from "@clerk/tanstack-react-start";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard - FlowERP" }] }),
  component: Dashboard,
});

const pipelineColors = ["#A1A1AA", "#6366F1", "#10B981"];

function Dashboard() {
  const { userId } = useAuth();
  const getDashboardSummaryFn = useServerFn(getDashboardSummary);
  const dashboardQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => getDashboardSummaryFn(),
    refetchInterval: 30000,
  });

  const getCurrentUserProfileFn = useServerFn(getCurrentUserProfile);
  const profileQuery = useQuery({
    queryKey: ["current-user", userId],
    queryFn: () => getCurrentUserProfileFn(),
    enabled: !!userId,
  });

  const canSee = (perm: string) => {
    if (!profileQuery.data) return false;
    const perms = profileQuery.data.permissions;
    return perms.includes("*") || perms.includes(perm);
  };

  const summary = dashboardQuery.data;

  const kpis = [];
  if (canSee("sales:read")) {
    kpis.push({ label: "Total Sales Orders", value: summary?.kpis.totalSalesOrders ?? 0, sub: "all demand", icon: ShoppingCart, tone: "text-primary", up: true });
    kpis.push({ label: "Pending Deliveries", value: summary?.kpis.pendingDeliveries ?? 0, sub: "needs dispatch", icon: Truck, tone: "text-warning", up: false });
  }
  if (canSee("purchase:read")) {
    kpis.push({ label: "Total Purchase Orders", value: summary?.kpis.totalPurchaseOrders ?? 0, sub: "manual and auto", icon: ShoppingBag, tone: "text-chart-5", up: true });
    kpis.push({ label: "Pending Receipts", value: summary?.kpis.pendingReceipts ?? 0, sub: "awaiting goods", icon: PackageX, tone: "text-warning", up: false });
  }
  if (canSee("manufacturing:read")) {
    kpis.push({ label: "Active Mfg. Orders", value: summary?.kpis.activeManufacturingOrders ?? 0, sub: "draft and running", icon: Factory, tone: "text-primary", up: true });
  }
  if (canSee("inventory:read")) {
    kpis.push({ label: "Low Stock Alerts", value: summary?.kpis.lowStockAlerts ?? 0, sub: "below reorder", icon: AlertTriangle, tone: "text-destructive", up: false });
  }

  return (
    <>
      <TopBar title="Dashboard" breadcrumb="Executive Overview" />
      <main className="p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success animate-pulse" />
              Live operations workspace
            </div>
            <h2 className="text-2xl font-semibold tracking-tight mt-1.5">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">Sales, procurement, manufacturing, and inventory connected in realtime.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => dashboardQuery.refetch()} className="h-8 gap-1.5 text-xs"><RefreshCw className="size-3.5" /> Refresh</Button>
            <Link to="/copilot"><Button size="sm" className="h-8 gap-1.5 text-xs"><Sparkles className="size-3.5" /> Ask FlowAI</Button></Link>
          </div>
        </div>

        {dashboardQuery.isError && (
          <Card className="p-4 border-destructive/30 bg-destructive/10 text-sm text-destructive">
            Dashboard could not be loaded. Check the database connection and try again.
          </Card>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="p-4 kpi-grad relative overflow-hidden border-border/70 hover:border-border transition group">
              <div className="flex items-start justify-between">
                <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{kpi.label}</div>
                <kpi.icon className={`size-3.5 ${kpi.tone}`} />
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
                {dashboardQuery.isLoading ? <div className="h-7 w-14 rounded bg-muted/60 animate-pulse" /> : kpi.value}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                <span className={`inline-flex items-center gap-0.5 font-medium ${kpi.up ? "text-success" : "text-warning"}`}>
                  {kpi.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />} Live
                </span>
                <span className="text-muted-foreground">{kpi.sub}</span>
              </div>
            </Card>
          ))}
        </div>

        {canSee("approvals:manage") && (
          <Card className="p-5 border-border/70 border-l-4 border-l-primary">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" /> Action Required: Pending Approvals</h3>
                <p className="text-xs text-muted-foreground">Approve or reject critical business operations.</p>
              </div>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">High Priority</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded border border-border/60 bg-muted/20">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Purchase Orders</div>
                <div className="flex items-end justify-between">
                  <div className="text-xl font-bold">0</div>
                  <Button variant="link" className="h-auto p-0 text-[10px]">Review</Button>
                </div>
              </div>
              <div className="p-3 rounded border border-border/60 bg-muted/20">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Inventory Adjustments</div>
                <div className="flex items-end justify-between">
                  <div className="text-xl font-bold">0</div>
                  <Button variant="link" className="h-auto p-0 text-[10px]">Review</Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          {canSee("inventory:read") && (
          <Card className="p-5 xl:col-span-1 border-border/70">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-semibold">Inventory Health</h3>
                <p className="text-xs text-muted-foreground">On-Hand vs Reserved</p>
              </div>
              <Badge variant="outline" className="text-[10px] border-border/70">Live</Badge>
            </div>
            <div className="h-[260px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary?.inventoryHealth ?? []} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 0 }} barCategoryGap={10}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#27272A" />
                  <XAxis type="number" stroke="#52525B" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} width={96} />
                  <Tooltip contentStyle={{ background: "#18181B", border: "1px solid #27272A", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="onHand" stackId="a" fill="#6366F1" radius={[4, 0, 0, 4]} />
                  <Bar dataKey="reserved" stackId="a" fill="#27272A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          )}

          {canSee("manufacturing:read") && (
          <Card className="p-5 border-border/70">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-semibold">Manufacturing Pipeline</h3>
                <p className="text-xs text-muted-foreground">Draft / running / completed</p>
              </div>
              <Factory className="size-4 text-muted-foreground" />
            </div>
            <div className="h-[200px] mt-3 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary?.manufacturingPipeline ?? []} dataKey="value" innerRadius={60} outerRadius={85} paddingAngle={3} strokeWidth={0}>
                    {(summary?.manufacturingPipeline ?? []).map((_, index) => <Cell key={index} fill={pipelineColors[index]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#18181B", border: "1px solid #27272A", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-2xl font-semibold tabular-nums">{summary?.manufacturingPipeline.reduce((sum, item) => sum + item.value, 0) ?? 0}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
              </div>
            </div>
            <div className="space-y-2 mt-3">
              {(summary?.manufacturingPipeline ?? []).map((pipeline, index) => (
                <div key={pipeline.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: pipelineColors[index] }} />{pipeline.name}</span>
                  <span className="tabular-nums font-medium">{pipeline.value}</span>
                </div>
              ))}
            </div>
          </Card>
          )}

          {(canSee("sales:read") || canSee("purchase:read")) && (
          <Card className="p-5 border-border/70">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-semibold">Order Trends</h3>
                <p className="text-xs text-muted-foreground">Last 7 days / Inventory {formatINR(summary?.kpis.inventoryValue ?? 0)}</p>
              </div>
              <Badge className="bg-success/15 text-success border-success/20 hover:bg-success/15 text-[10px]">Live</Badge>
            </div>
            <div className="h-[260px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary?.orderTrend ?? []} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSalesOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gPurchaseOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                  <XAxis dataKey="day" stroke="#52525B" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525B" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#18181B", border: "1px solid #27272A", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="salesOrders" stroke="#6366F1" strokeWidth={2} fill="url(#gSalesOrders)" />
                  <Area type="monotone" dataKey="purchaseOrders" stroke="#10B981" strokeWidth={2} fill="url(#gPurchaseOrders)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          {canSee("purchase:read") && (
          <Card className="p-5 border-border/70">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2"><Zap className="size-4 text-warning" /> Procurement Alerts</h3>
                <p className="text-xs text-muted-foreground">Critical low-stock signals</p>
              </div>
            </div>
            <div className="space-y-2">
              {(summary?.procurementAlerts ?? []).length === 0 && (
                <div className="text-xs text-muted-foreground">No low-stock alerts right now.</div>
              )}
              {(summary?.procurementAlerts ?? []).map((alert) => (
                <div key={alert.id} className="p-3 rounded-md border border-border/70 hover:border-border bg-background/40 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <PackageX className="size-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium truncate">{alert.name}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">On-Hand <span className="text-foreground font-medium tabular-nums">{alert.onHand}</span> / Reorder at <span className="tabular-nums">{alert.reorder}</span></div>
                    </div>
                    <Badge className={alert.priority === "Critical" ? "bg-destructive/15 text-destructive border-destructive/20 hover:bg-destructive/15 text-[10px]" : alert.priority === "High" ? "bg-warning/15 text-warning border-warning/20 hover:bg-warning/15 text-[10px]" : "bg-muted text-muted-foreground border-border text-[10px]"}>{alert.priority}</Badge>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Suggested reorder / <span className="text-foreground font-medium">{alert.suggested} units</span></span>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2">Create PO</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          )}

          <Card className={`p-5 border-border/70 ${canSee("purchase:read") ? "xl:col-span-2" : "xl:col-span-3"}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2"><Activity className="size-4 text-muted-foreground" /> Recent Activity</h3>
                <p className="text-xs text-muted-foreground">Operations stream across modules</p>
              </div>
            </div>
            <div className="relative pl-5">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {(summary?.recentActivity ?? []).filter(e => {
                  if (e.type === "sales" || e.type === "delivery") return canSee("sales:read");
                  if (e.type === "procurement") return canSee("purchase:read");
                  if (e.type === "manufacturing") return canSee("manufacturing:read");
                  if (e.type === "inventory") return canSee("inventory:read");
                  return true;
                }).length === 0 && (
                  <div className="text-xs text-muted-foreground">No activity yet. Seed data or confirm an order to populate this feed.</div>
                )}
                {(summary?.recentActivity ?? []).filter(e => {
                  if (e.type === "sales" || e.type === "delivery") return canSee("sales:read");
                  if (e.type === "procurement") return canSee("purchase:read");
                  if (e.type === "manufacturing") return canSee("manufacturing:read");
                  if (e.type === "inventory") return canSee("inventory:read");
                  return true;
                }).map((event) => {
                  const iconMap = { sales: ShoppingCart, manufacturing: Factory, inventory: Boxes, delivery: CheckCircle2, procurement: ShoppingBag };
                  const Icon = iconMap[event.type];
                  const dot = event.type === "delivery" ? "bg-success" : event.type === "manufacturing" ? "bg-primary" : event.type === "procurement" ? "bg-warning" : "bg-muted-foreground";
                  return (
                    <div key={event.id} className="relative">
                      <div className={`absolute -left-[18px] top-1 size-3.5 rounded-full border-2 border-background ${dot} flex items-center justify-center`}>
                        <Icon className="size-2 text-background" />
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-medium">{event.title}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{event.detail}</div>
                        </div>
                        <div className="text-[11px] text-muted-foreground whitespace-nowrap">{event.user} / {formatMovementTime(event.time)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
