import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatINR } from "@/lib/mock-data";

export const Route = createFileRoute("/purchase-orders")({
  head: () => ({ meta: [{ title: "Purchase Orders · FlowERP" }] }),
  component: POPage,
});

const pos = [
  { id: "PO-882", vendor: "TechBolt Industries", item: "Steel Screw M8 × 5,000", amount: 20000, status: "Sent", date: "2026-06-13" },
  { id: "PO-881", vendor: "Oakwood Timber Co.", item: "Wooden Top — Oak × 80", amount: 256000, status: "Received", date: "2026-06-12" },
  { id: "PO-880", vendor: "Oakwood Timber Co.", item: "Wooden Leg — Oak × 250", amount: 120000, status: "Confirmed", date: "2026-06-11" },
  { id: "PO-879", vendor: "Hyderabad Leather Mills", item: "Leather Roll × 30", amount: 84000, status: "Sent", date: "2026-06-10" },
  { id: "PO-878", vendor: "TechBolt Industries", item: "Steel Screw M8 × 10,000", amount: 40000, status: "Received", date: "2026-06-08" },
];

const tone: Record<string, string> = {
  Sent: "bg-primary/15 text-primary border-primary/20 text-[10px]",
  Confirmed: "bg-warning/15 text-warning border-warning/20 text-[10px]",
  Received: "bg-success/15 text-success border-success/20 text-[10px]",
};

function POPage() {
  return (
    <>
      <TopBar title="Purchase Orders" breadcrumb="Procurement" />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Purchase Orders</h2>
            <p className="text-sm text-muted-foreground">{pos.length} active POs · {formatINR(pos.reduce((s, p) => s + p.amount, 0))} committed</p>
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5"><Plus className="size-3.5" /> New PO</Button>
        </div>
        <Card className="border-border/70 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">PO</th>
                <th className="px-4 py-2.5 font-medium">Vendor</th>
                <th className="px-4 py-2.5 font-medium">Item</th>
                <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((p) => (
                <tr key={p.id} className="border-t border-border/60 hover:bg-accent/40 transition">
                  <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                  <td className="px-4 py-3">{p.vendor}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{p.item}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatINR(p.amount)}</td>
                  <td className="px-4 py-3"><Badge className={tone[p.status]}>{p.status}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </>
  );
}
