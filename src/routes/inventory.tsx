import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowDownRight, ArrowUpRight, Warehouse, AlertTriangle, TrendingUp } from "lucide-react";
import { products, inventoryMovements, formatINR } from "@/lib/mock-data";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory · FlowERP" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const totalValue = products.reduce((s, p) => s + p.price * p.onHand, 0);
  const lowStock = products.filter((p) => p.onHand - p.reserved <= p.reorderPoint).length;

  return (
    <>
      <TopBar title="Inventory" breadcrumb="Warehouse Control" />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Inventory</h2>
            <p className="text-sm text-muted-foreground">Realtime stock across 6 warehouses</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Inventory Value", value: formatINR(totalValue), icon: Warehouse, tone: "text-foreground" },
            { label: "SKUs Tracked", value: products.length, icon: TrendingUp, tone: "text-primary" },
            { label: "Low Stock", value: lowStock, icon: AlertTriangle, tone: "text-warning" },
            { label: "Movements Today", value: 14, icon: ArrowUpRight, tone: "text-success" },
          ].map((s) => (
            <Card key={s.label} className="p-4 border-border/70">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <s.icon className={`size-3.5 ${s.tone}`} />
              </div>
              <div className={`text-xl font-semibold tabular-nums mt-2 ${s.tone}`}>{s.value}</div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <Card className="border-border/70 overflow-hidden xl:col-span-2">
            <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Inventory</h3>
              <div className="relative">
                <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input placeholder="Search…" className="h-8 pl-8 text-xs w-56 bg-card border-border/70" />
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">SKU</th>
                  <th className="px-4 py-2.5 font-medium">Product</th>
                  <th className="px-4 py-2.5 font-medium text-right">On-Hand</th>
                  <th className="px-4 py-2.5 font-medium text-right">Reserved</th>
                  <th className="px-4 py-2.5 font-medium text-right">Free</th>
                  <th className="px-4 py-2.5 font-medium">Health</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const free = p.onHand - p.reserved;
                  const ratio = Math.max(0, Math.min(100, (free / Math.max(p.reorderPoint, 1)) * 50));
                  const tone = free <= p.reorderPoint ? "bg-destructive" : free <= p.reorderPoint * 1.5 ? "bg-warning" : "bg-success";
                  return (
                    <tr key={p.id} className="border-t border-border/60 hover:bg-accent/40 transition">
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{p.sku}</td>
                      <td className="px-4 py-3">{p.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{p.onHand}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{p.reserved}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{free}</td>
                      <td className="px-4 py-3 w-40">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full ${tone}`} style={{ width: `${Math.min(100, ratio)}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Card className="border-border/70 p-5">
            <h3 className="text-sm font-semibold">Stock Movement Timeline</h3>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
            <div className="relative pl-5 mt-4">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-3">
                {inventoryMovements.map((m) => (
                  <div key={m.id} className="relative">
                    <div className={`absolute -left-[18px] top-1 size-3 rounded-full border-2 border-card ${m.change > 0 ? "bg-success" : "bg-destructive"}`} />
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-medium">{m.sku}</div>
                        <div className="text-[11px] text-muted-foreground">{m.reason}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-medium tabular-nums flex items-center gap-0.5 ${m.change > 0 ? "text-success" : "text-destructive"}`}>
                          {m.change > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{Math.abs(m.change)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{m.time}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
