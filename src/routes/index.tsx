import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowUpRight, ArrowDownRight, ShoppingCart, Truck, Factory,
  AlertTriangle, PackageX, Wallet, ShoppingBag, CheckCircle2,
  Boxes, Sparkles, Activity, Zap, RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  orderTrend, inventoryHealth, manufacturingPipeline, recentActivity,
  procurementAlerts, formatINR,
} from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard · FlowERP" }] }),
  component: Dashboard,
});

const kpis = [
  { label: "Total Sales Orders", value: "1,284", delta: "+12.4%", up: true, sub: "vs. last month", icon: ShoppingCart },
  { label: "Pending Deliveries", value: "37", delta: "−6.1%", up: false, sub: "8 due this week", icon: Truck },
  { label: "Active Mfg. Orders", value: "23", delta: "+3", up: true, sub: "4 completing today", icon: Factory },
  { label: "Low Stock Alerts", value: "12", delta: "+4", up: false, danger: true, sub: "3 critical", icon: AlertTriangle },
  { label: "Procurement Triggers", value: "8", delta: "+2", up: true, sub: "₹4.2L pending PO", icon: ShoppingBag },
  { label: "Inventory Value", value: "₹2.84 Cr", delta: "+1.8%", up: true, sub: "Across 6 warehouses", icon: Wallet },
];

const pipelineColors = ["#A1A1AA", "#6366F1", "#10B981"];

function Dashboard() {
  return (
    <>
      <TopBar title="Dashboard" breadcrumb="Executive Overview" />
      <main className="p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* Welcome */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success animate-pulse" />
              All systems operational · Saturday, June 13
            </div>
            <h2 className="text-2xl font-semibold tracking-tight mt-1.5">Welcome back, Admin</h2>
            <p className="text-sm text-muted-foreground mt-1">Here's what's happening across your manufacturing operations today.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"><RefreshCw className="size-3.5" /> Refresh</Button>
            <Button size="sm" className="h-8 gap-1.5 text-xs"><Sparkles className="size-3.5" /> Ask FlowAI</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpis.map((k) => (
            <Card key={k.label} className="p-4 kpi-grad relative overflow-hidden border-border/70 hover:border-border transition group">
              <div className="flex items-start justify-between">
                <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{k.label}</div>
                <k.icon className={`size-3.5 ${k.danger ? "text-destructive" : "text-muted-foreground"}`} />
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{k.value}</div>
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                <span className={`inline-flex items-center gap-0.5 font-medium ${k.up ? "text-success" : "text-destructive"}`}>
                  {k.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{k.delta}
                </span>
                <span className="text-muted-foreground">{k.sub}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          {/* Inventory health */}
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
                <BarChart data={inventoryHealth} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 0 }} barCategoryGap={10}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#27272A" />
                  <XAxis type="number" stroke="#52525B" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} width={88} />
                  <Tooltip contentStyle={{ background: "#18181B", border: "1px solid #27272A", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="onHand" stackId="a" fill="#6366F1" radius={[4, 0, 0, 4]} />
                  <Bar dataKey="reserved" stackId="a" fill="#27272A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-2">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-primary" /> On-Hand</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-border" /> Reserved</span>
            </div>
          </Card>

          {/* Manufacturing pipeline */}
          <Card className="p-5 border-border/70">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-semibold">Manufacturing Pipeline</h3>
                <p className="text-xs text-muted-foreground">7 active work orders</p>
              </div>
              <Factory className="size-4 text-muted-foreground" />
            </div>
            <div className="h-[200px] mt-3 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={manufacturingPipeline} dataKey="value" innerRadius={60} outerRadius={85} paddingAngle={3} strokeWidth={0}>
                    {manufacturingPipeline.map((_, i) => <Cell key={i} fill={pipelineColors[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#18181B", border: "1px solid #27272A", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-2xl font-semibold tabular-nums">7</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
              </div>
            </div>
            <div className="space-y-2 mt-3">
              {manufacturingPipeline.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: pipelineColors[i] }} />{p.name}</span>
                  <span className="tabular-nums font-medium">{p.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Order trend */}
          <Card className="p-5 border-border/70">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-semibold">Order Trends</h3>
                <p className="text-xs text-muted-foreground">Last 7 days · Revenue {formatINR(2964000)}</p>
              </div>
              <Badge className="bg-success/15 text-success border-success/20 hover:bg-success/15 text-[10px]">+18%</Badge>
            </div>
            <div className="h-[260px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={orderTrend} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                  <XAxis dataKey="day" stroke="#52525B" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525B" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#18181B", border: "1px solid #27272A", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="orders" stroke="#6366F1" strokeWidth={2} fill="url(#gOrders)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Procurement + Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <Card className="p-5 border-border/70">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2"><Zap className="size-4 text-warning" /> Procurement Alerts</h3>
                <p className="text-xs text-muted-foreground">Critical low-stock signals</p>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs">View all</Button>
            </div>
            <div className="space-y-2">
              {procurementAlerts.map((a) => {
                const tone = a.priority === "Critical" ? "destructive" : a.priority === "High" ? "warning" : "muted";
                return (
                  <div key={a.id} className="p-3 rounded-md border border-border/70 hover:border-border bg-background/40 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <PackageX className="size-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium truncate">{a.name}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">On-Hand <span className="text-foreground font-medium tabular-nums">{a.onHand}</span> · Reorder ≤ <span className="tabular-nums">{a.reorder}</span></div>
                      </div>
                      <Badge className={
                        tone === "destructive" ? "bg-destructive/15 text-destructive border-destructive/20 hover:bg-destructive/15 text-[10px]" :
                        tone === "warning" ? "bg-warning/15 text-warning border-warning/20 hover:bg-warning/15 text-[10px]" :
                        "bg-muted text-muted-foreground border-border text-[10px]"
                      }>{a.priority}</Badge>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Suggested reorder · <span className="text-foreground font-medium">{a.suggested} units</span></span>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2">Create PO</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Activity timeline */}
          <Card className="p-5 border-border/70 xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2"><Activity className="size-4 text-muted-foreground" /> Recent Activity</h3>
                <p className="text-xs text-muted-foreground">Operations stream across modules</p>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs">Open audit log</Button>
            </div>
            <div className="relative pl-5">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {recentActivity.map((e) => {
                  const iconMap = { sales: ShoppingCart, manufacturing: Factory, inventory: Boxes, delivery: CheckCircle2, procurement: ShoppingBag };
                  const Icon = iconMap[e.type];
                  const dot = e.type === "delivery" ? "bg-success" : e.type === "manufacturing" ? "bg-primary" : e.type === "procurement" ? "bg-warning" : "bg-muted-foreground";
                  return (
                    <div key={e.id} className="relative">
                      <div className={`absolute -left-[18px] top-1 size-3.5 rounded-full border-2 border-background ${dot} flex items-center justify-center`}>
                        <Icon className="size-2 text-background" />
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-medium">{e.title}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{e.detail}</div>
                        </div>
                        <div className="text-[11px] text-muted-foreground whitespace-nowrap">{e.user} · {e.time}</div>
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
