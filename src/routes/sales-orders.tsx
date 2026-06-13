import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Plus, Factory, ArrowRight, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { salesOrders, formatINR, type SalesOrder } from "@/lib/mock-data";

export const Route = createFileRoute("/sales-orders")({
  head: () => ({ meta: [{ title: "Sales Orders · FlowERP" }] }),
  component: SalesPage,
});

const statusTone: Record<SalesOrder["status"], string> = {
  Draft: "bg-muted text-muted-foreground border-border text-[10px]",
  Confirmed: "bg-primary/15 text-primary border-primary/20 hover:bg-primary/15 text-[10px]",
  "In Production": "bg-warning/15 text-warning border-warning/20 hover:bg-warning/15 text-[10px]",
  Ready: "bg-chart-5/15 text-chart-5 border-chart-5/20 text-[10px]",
  Delivered: "bg-success/15 text-success border-success/20 hover:bg-success/15 text-[10px]",
};

function SalesPage() {
  const [selected, setSelected] = useState<SalesOrder | null>(null);

  return (
    <>
      <TopBar title="Sales Orders" breadcrumb="Pipeline" />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Sales Orders</h2>
            <p className="text-sm text-muted-foreground">{salesOrders.length} active orders · {formatINR(salesOrders.reduce((s, o) => s + o.amount, 0))} pipeline value</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="Search orders, customers…" className="h-8 pl-8 text-xs w-64 bg-card border-border/70" />
            </div>
            <Button size="sm" className="h-8 text-xs gap-1.5"><Plus className="size-3.5" /> New Order</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Draft", count: 1, color: "text-muted-foreground" },
            { label: "Confirmed", count: 2, color: "text-primary" },
            { label: "In Production", count: 1, color: "text-warning" },
            { label: "Ready", count: 1, color: "text-chart-5" },
            { label: "Delivered", count: 1, color: "text-success" },
          ].map((s) => (
            <Card key={s.label} className="p-4 border-border/70">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className={`text-2xl font-semibold tabular-nums mt-1 ${s.color}`}>{s.count}</div>
            </Card>
          ))}
        </div>

        <Card className="border-border/70 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Order ID</th>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody>
              {salesOrders.map((o) => (
                <tr key={o.id} onClick={() => setSelected(o)} className="border-t border-border/60 hover:bg-accent/40 cursor-pointer transition">
                  <td className="px-4 py-3 font-mono text-xs">{o.id}</td>
                  <td className="px-4 py-3 font-medium">{o.customer}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{formatINR(o.amount)}</td>
                  <td className="px-4 py-3"><Badge className={statusTone[o.status]}>{o.status}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{o.date}</td>
                  <td className="px-4 py-3"><ArrowRight className="size-3.5 text-muted-foreground" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-lg bg-card border-border overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {selected.id} · {selected.date}
                </div>
                <SheetTitle className="text-lg">{selected.customer}</SheetTitle>
                <div className="flex items-center gap-2">
                  <Badge className={statusTone[selected.status]}>{selected.status}</Badge>
                  <span className="text-lg font-semibold tabular-nums">{formatINR(selected.amount)}</span>
                </div>
              </SheetHeader>
              <div className="px-4 space-y-4">
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Line items</div>
                  {selected.items.map((it, i) => (
                    <div key={i} className="p-3 rounded-md border border-border/70 bg-background/40 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{it.name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">{it.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm tabular-nums">{it.qty} × {formatINR(it.price)}</div>
                        <div className="text-[11px] text-muted-foreground tabular-nums">{formatINR(it.qty * it.price)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-md border border-border/70 bg-background/40 space-y-2">
                  <div className="text-xs font-semibold flex items-center gap-2">Inventory Check</div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Required</span><span className="tabular-nums">26 units</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Available (Free)</span><span className="tabular-nums text-warning">14 units</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Shortfall</span><span className="tabular-nums text-destructive">12 units</span></div>
                </div>

                {selected.id === "SO-10421" && (
                  <div className="p-4 rounded-lg border border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 size-24 rounded-full bg-primary/20 blur-2xl" />
                    <div className="flex items-start gap-3 relative">
                      <div className="size-8 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
                        <Sparkles className="size-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs uppercase tracking-wider text-primary font-medium">Automation</div>
                        <div className="text-sm font-semibold mt-0.5">Manufacturing Order automatically generated</div>
                        <p className="text-xs text-muted-foreground mt-1">FlowERP detected a 12-unit shortfall on Wooden Dining Table and created <span className="font-mono text-foreground">MO-3001</span> to produce the required quantity.</p>
                        <div className="flex items-center gap-2 mt-3">
                          <Button size="sm" className="h-7 text-[11px]">View MO-3001 <ArrowRight className="size-3 ml-1" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[11px]">Dismiss</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-md border border-border/70 bg-background/40">
                  <div className="text-xs font-semibold mb-2">Procurement Status</div>
                  <div className="space-y-2">
                    {[
                      { label: "Components reserved", ok: true },
                      { label: "Raw material PO confirmed", ok: true },
                      { label: "Manufacturing scheduled", ok: selected.status !== "Draft" },
                      { label: "Ready for dispatch", ok: selected.status === "Ready" || selected.status === "Delivered" },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {s.ok ? <CheckCircle2 className="size-3.5 text-success" /> : <AlertCircle className="size-3.5 text-muted-foreground" />}
                        <span className={s.ok ? "" : "text-muted-foreground"}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
