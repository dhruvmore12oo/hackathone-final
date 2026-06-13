import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Filter, Plus, Package, Boxes, Wallet, Tag } from "lucide-react";
import { useState } from "react";
import { products, formatINR, type Product } from "@/lib/mock-data";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products · FlowERP" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const [selected, setSelected] = useState<Product | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const cats = ["All", ...Array.from(new Set(products.map((p) => p.category)))];
  const list = filter === "All" ? products : products.filter((p) => p.category === filter);

  return (
    <>
      <TopBar title="Products" breadcrumb="Catalog" />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Product Catalog</h2>
            <p className="text-sm text-muted-foreground">{products.length} SKUs · 3 categories</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="Search SKU, name…" className="h-8 pl-8 text-xs w-64 bg-card border-border/70" />
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"><Filter className="size-3.5" /> Filters</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5"><Plus className="size-3.5" /> New Product</Button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {cats.map((c) => (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-2.5 py-1 rounded-md text-xs border transition ${filter === c ? "bg-accent border-border text-foreground" : "border-border/70 text-muted-foreground hover:text-foreground hover:border-border"}`}>
              {c}
            </button>
          ))}
        </div>

        <Card className="border-border/70 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">SKU</th>
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Procurement</th>
                <th className="px-4 py-2.5 font-medium text-right">Price</th>
                <th className="px-4 py-2.5 font-medium text-right">On-Hand</th>
                <th className="px-4 py-2.5 font-medium text-right">Reserved</th>
                <th className="px-4 py-2.5 font-medium text-right">Free</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const free = p.onHand - p.reserved;
                const low = free <= p.reorderPoint;
                return (
                  <tr key={p.id} onClick={() => setSelected(p)} className="border-t border-border/60 hover:bg-accent/40 cursor-pointer transition">
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{p.sku}</td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] border-border/70">{p.procurement}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatINR(p.price)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.onHand}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{p.reserved}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{free}</td>
                    <td className="px-4 py-3">
                      <Badge className={low ? "bg-destructive/15 text-destructive border-destructive/20 hover:bg-destructive/15 text-[10px]" : "bg-success/15 text-success border-success/20 hover:bg-success/15 text-[10px]"}>
                        {low ? "Low Stock" : "Healthy"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </main>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-md bg-card border-border">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">{selected.category} · {selected.procurement}</div>
                <SheetTitle className="text-lg">{selected.name}</SheetTitle>
                <div className="text-xs font-mono text-muted-foreground">{selected.sku}</div>
              </SheetHeader>
              <div className="px-4 space-y-4">
                <div className="aspect-video rounded-lg border border-border/70 bg-gradient-to-br from-muted/40 to-background flex items-center justify-center">
                  <Package className="size-12 text-muted-foreground/50" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "On-Hand", value: selected.onHand, icon: Boxes, tone: "text-foreground" },
                    { label: "Reserved", value: selected.reserved, icon: Tag, tone: "text-muted-foreground" },
                    { label: "Free-to-Use", value: selected.onHand - selected.reserved, icon: Wallet, tone: "text-success" },
                  ].map((s) => (
                    <div key={s.label} className="p-3 rounded-md border border-border/70 bg-background/40">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                      <div className={`text-lg font-semibold tabular-nums mt-1 ${s.tone}`}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-md border border-border/70 bg-background/40 space-y-2">
                  <div className="text-xs font-semibold">Pricing</div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">List price</span><span className="tabular-nums font-medium">{formatINR(selected.price)}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Unit</span><span>{selected.unit}</span></div>
                </div>
                <div className="p-4 rounded-md border border-border/70 bg-background/40 space-y-2">
                  <div className="text-xs font-semibold">Procurement Configuration</div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Strategy</span><Badge variant="outline" className="text-[10px]">{selected.procurement}</Badge></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Reorder point</span><span className="tabular-nums">{selected.reorderPoint}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Lead time</span><span>{selected.procurement === "Buy" ? "4 days" : "7 days"}</span></div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
