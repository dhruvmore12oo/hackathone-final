import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListTree, Package } from "lucide-react";

export const Route = createFileRoute("/bom")({
  head: () => ({ meta: [{ title: "Bill of Materials · FlowERP" }] }),
  component: BoMPage,
});

const boms = [
  { product: "Wooden Dining Table", sku: "FRN-TBL-OAK", items: [
    { name: "Wooden Top — Oak", qty: 1 },
    { name: "Wooden Leg — Oak", qty: 4 },
    { name: "Steel Screw M8", qty: 24 },
  ]},
  { product: "Executive Office Chair", sku: "FRN-CHR-EXE", items: [
    { name: "Leather Fabric Roll", qty: 0.5 },
    { name: "Wooden Leg — Oak", qty: 5 },
    { name: "Steel Screw M8", qty: 18 },
  ]},
  { product: "Coffee Table — Walnut", sku: "FRN-TBL-CFE", items: [
    { name: "Wooden Top — Oak", qty: 1 },
    { name: "Wooden Leg — Oak", qty: 4 },
    { name: "Steel Screw M8", qty: 16 },
  ]},
];

function BoMPage() {
  return (
    <>
      <TopBar title="Bill of Materials" breadcrumb="Manufacturing" />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Bill of Materials</h2>
          <p className="text-sm text-muted-foreground">Component recipes for manufactured products</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {boms.map((b) => (
            <Card key={b.sku} className="p-5 border-border/70">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{b.sku}</div>
                  <div className="text-sm font-semibold mt-1">{b.product}</div>
                </div>
                <ListTree className="size-4 text-muted-foreground" />
              </div>
              <div className="mt-4 space-y-2">
                {b.items.map((i) => (
                  <div key={i.name} className="flex items-center justify-between p-2.5 rounded-md border border-border/60 bg-background/40">
                    <div className="flex items-center gap-2">
                      <Package className="size-3.5 text-muted-foreground" />
                      <span className="text-xs">{i.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-border/70 tabular-nums">× {i.qty}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
