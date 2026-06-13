import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, ArrowDownRight, ArrowUpRight, Warehouse, AlertTriangle, TrendingUp, SlidersHorizontal } from "lucide-react";

import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adjustInventory, getInventoryOverview } from "@/lib/api/inventory.functions";
import { getCurrentUserProfile } from "@/lib/api/auth.functions";
import { formatINR, formatMovementTime } from "@/lib/formatters";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory - FlowERP" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ productId: "", qtyChange: "0", reason: "" });
  const adjustInventoryFn = useServerFn(adjustInventory);
  const getInventoryOverviewFn = useServerFn(getInventoryOverview);
  const inventoryQuery = useQuery({
    queryKey: ["inventory-overview"],
    queryFn: () => getInventoryOverviewFn(),
  });

  const getCurrentUserProfileFn = useServerFn(getCurrentUserProfile);
  const profileQuery = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: () => getCurrentUserProfileFn(),
  });
  const permissions = profileQuery.data?.permissions || [];
  const hasAdjustPerm = permissions.includes("*") || permissions.includes("inventory:write") || permissions.includes("inventory:adjust_stock");

  const adjustMutation = useMutation({
    mutationFn: () => adjustInventoryFn({
      data: {
        productId: adjustForm.productId,
        qtyChange: Number(adjustForm.qtyChange),
        reason: adjustForm.reason,
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success("Stock adjustment posted.");
      setAdjustOpen(false);
      setAdjustForm({ productId: "", qtyChange: "0", reason: "" });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not adjust stock.");
    },
  });

  const overview = inventoryQuery.data;
  const products = overview?.products ?? [];
  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return products;

    return products.filter((product) =>
      [product.sku, product.name].some((value) => value.toLowerCase().includes(term)),
    );
  }, [products, search]);
  const canAdjust = adjustForm.productId && Number(adjustForm.qtyChange) !== 0 && adjustForm.reason.trim().length >= 10;

  return (
    <>
      <TopBar title="Inventory" breadcrumb="Warehouse Control" />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Inventory</h2>
            <p className="text-sm text-muted-foreground">Realtime stock across your FlowERP warehouse</p>
          </div>
          {hasAdjustPerm && (
            <Button size="sm" onClick={() => setAdjustOpen(true)} className="h-8 text-xs gap-1.5">
              <SlidersHorizontal className="size-3.5" /> Adjust Stock
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Inventory Value", value: formatINR(overview?.totalValue ?? 0), icon: Warehouse, tone: "text-foreground" },
            { label: "SKUs Tracked", value: products.length, icon: TrendingUp, tone: "text-primary" },
            { label: "Low Stock", value: overview?.lowStockCount ?? 0, icon: AlertTriangle, tone: "text-warning" },
            { label: "Movements Today", value: overview?.movementsToday ?? 0, icon: ArrowUpRight, tone: "text-success" },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 border-border/70">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</div>
                <stat.icon className={`size-3.5 ${stat.tone}`} />
              </div>
              <div className={`text-xl font-semibold tabular-nums mt-2 ${stat.tone}`}>
                {inventoryQuery.isLoading ? <div className="h-6 w-20 rounded bg-muted/60 animate-pulse" /> : stat.value}
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <Card className="border-border/70 overflow-hidden xl:col-span-2">
            <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Inventory</h3>
              <div className="relative">
                <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search..."
                  className="h-8 pl-8 text-xs w-56 bg-card border-border/70"
                />
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
                {inventoryQuery.isLoading && Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-t border-border/60">
                    <td className="px-4 py-3" colSpan={6}>
                      <div className="h-4 rounded bg-muted/60 animate-pulse" />
                    </td>
                  </tr>
                ))}
                {!inventoryQuery.isLoading && inventoryQuery.isError && (
                  <tr className="border-t border-border/60">
                    <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                      Inventory could not be loaded. Check the database connection and try again.
                    </td>
                  </tr>
                )}
                {!inventoryQuery.isLoading && !inventoryQuery.isError && filteredProducts.length === 0 && (
                  <tr className="border-t border-border/60">
                    <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                      No inventory records found.
                    </td>
                  </tr>
                )}
                {!inventoryQuery.isLoading && !inventoryQuery.isError && filteredProducts.map((product) => {
                  const ratio = Math.max(0, Math.min(100, (product.freeToUse / Math.max(product.reorderPoint, 1)) * 50));
                  const tone = product.freeToUse <= product.reorderPoint ? "bg-destructive" : product.freeToUse <= product.reorderPoint * 1.5 ? "bg-warning" : "bg-success";

                  return (
                    <tr key={product.id} className="border-t border-border/60 hover:bg-accent/40 transition">
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{product.sku}</td>
                      <td className="px-4 py-3">{product.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{product.onHand}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{product.reserved}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{product.freeToUse}</td>
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
            <p className="text-xs text-muted-foreground">Latest stock ledger entries</p>
            <div className="relative pl-5 mt-4">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-3">
                {inventoryQuery.isLoading && Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-10 rounded bg-muted/50 animate-pulse" />
                ))}
                {!inventoryQuery.isLoading && overview?.movements.length === 0 && (
                  <div className="text-xs text-muted-foreground">No stock movements yet.</div>
                )}
                {!inventoryQuery.isLoading && overview?.movements.map((movement) => (
                  <div key={movement.id} className="relative">
                    <div className={`absolute -left-[18px] top-1 size-3 rounded-full border-2 border-card ${movement.change > 0 ? "bg-success" : "bg-destructive"}`} />
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-medium">{movement.sku}</div>
                        <div className="text-[11px] text-muted-foreground">{movement.reason}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-medium tabular-nums flex items-center gap-0.5 ${movement.change > 0 ? "text-success" : "text-destructive"}`}>
                          {movement.change > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{Math.abs(movement.change)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{formatMovementTime(movement.time)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </main>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Manual Stock Adjustment</DialogTitle>
            <DialogDescription>
              Post a controlled inventory correction. Every adjustment writes to the stock ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={adjustForm.productId || undefined} onValueChange={(value) => setAdjustForm((form) => ({ ...form, productId: value }))}>
                <SelectTrigger className="bg-background/40">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>{product.sku} / {product.name} / On-hand {product.onHand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qtyChange">Quantity Change</Label>
              <Input
                id="qtyChange"
                type="number"
                value={adjustForm.qtyChange}
                onChange={(event) => setAdjustForm((form) => ({ ...form, qtyChange: event.target.value }))}
                className="bg-background/40"
                placeholder="-2 or 10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={adjustForm.reason}
                onChange={(event) => setAdjustForm((form) => ({ ...form, reason: event.target.value }))}
                className="bg-background/40"
                placeholder="Physical stock count correction..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button disabled={!canAdjust || adjustMutation.isPending} onClick={() => adjustMutation.mutate()}>
              Post Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
