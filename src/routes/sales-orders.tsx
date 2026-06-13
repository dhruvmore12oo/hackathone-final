import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Plus, Factory, ArrowRight, Sparkles, CheckCircle2, AlertCircle, Trash2, XCircle } from "lucide-react";

import { TopBar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getCurrentUserProfile } from "@/lib/api/auth.functions";
import { listProducts } from "@/lib/api/products.functions";
import { cancelSalesOrder, confirmSalesOrder, createSalesOrder, deliverSalesOrder, listSalesOrders, type SalesOrderListItem, type SalesOrderStatusLabel } from "@/lib/api/sales.functions";
import { formatINR } from "@/lib/formatters";

export const Route = createFileRoute("/sales-orders")({
  head: () => ({ meta: [{ title: "Sales Orders - FlowERP" }] }),
  component: SalesPage,
});

const statusTone: Record<SalesOrderStatusLabel, string> = {
  Draft: "bg-muted text-muted-foreground border-border text-[10px]",
  Confirmed: "bg-primary/15 text-primary border-primary/20 hover:bg-primary/15 text-[10px]",
  "Partially Delivered": "bg-warning/15 text-warning border-warning/20 hover:bg-warning/15 text-[10px]",
  "Fully Delivered": "bg-success/15 text-success border-success/20 hover:bg-success/15 text-[10px]",
  Cancelled: "bg-destructive/15 text-destructive border-destructive/20 hover:bg-destructive/15 text-[10px]",
};

const summaryStatuses: SalesOrderStatusLabel[] = ["Draft", "Confirmed", "Partially Delivered", "Fully Delivered", "Cancelled"];

function makeDraftLine() {
  return {
    key: Math.random().toString(36).slice(2),
    productId: "",
    qty: "1",
  };
}

function SalesPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<SalesOrderListItem | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [draftLines, setDraftLines] = useState([makeDraftLine()]);
  const [deliveryQtys, setDeliveryQtys] = useState<Record<string, string>>({});
  const listSalesOrdersFn = useServerFn(listSalesOrders);
  const listProductsFn = useServerFn(listProducts);
  const createSalesOrderFn = useServerFn(createSalesOrder);
  const confirmSalesOrderFn = useServerFn(confirmSalesOrder);
  const deliverSalesOrderFn = useServerFn(deliverSalesOrder);
  const cancelSalesOrderFn = useServerFn(cancelSalesOrder);

  const salesQuery = useQuery({
    queryKey: ["sales-orders"],
    queryFn: () => listSalesOrdersFn(),
  });

  const getCurrentUserProfileFn = useServerFn(getCurrentUserProfile);
  const profileQuery = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: () => getCurrentUserProfileFn(),
  });
  const permissions = profileQuery.data?.permissions || [];
  const can = (p: string) => permissions.includes("*") || permissions.includes(p);
  const canWrite = can("sales:write");
  const hasCreatePerm = canWrite || can("sales:create");
  const canApprove = canWrite || can("sales:approve");
  const canDelete = canWrite || can("sales:delete");
  const canEditOwn = canWrite || can("sales:edit_own");

  const productPickerQuery = useQuery({
    queryKey: ["sales-order-product-picker"],
    queryFn: () => listProductsFn({ data: { category: "All", search: "" } }),
  });

  const createMutation = useMutation({
    mutationFn: () => createSalesOrderFn({
      data: {
        customerName,
        lines: draftLines
          .filter((line) => line.productId && Number(line.qty) > 0)
          .map((line) => ({ productId: line.productId, qty: Number(line.qty) })),
      },
    }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success(`${result.data.orderNumber} created.`);
      setSelected(result.data);
      setCreateOpen(false);
      setCustomerName("");
      setDraftLines([makeDraftLine()]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create sales order.");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmSalesOrderFn({ data: { id } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
      const actions = result.procurementActions;
      if (actions.length > 0) {
        toast.success(`Auto-created ${actions.map((action) => action.number).join(", ")}`);
      } else {
        toast.success("Sales order confirmed and stock reserved.");
      }
      setSelected(result.data);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not confirm sales order.");
    },
  });

  const deliverMutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No order selected.");
      const lines = selected.items
        .map((item) => ({
          lineId: item.id,
          deliveredQty: Number(deliveryQtys[item.id] || 0),
        }))
        .filter((item) => item.deliveredQty > 0);
      if (lines.length === 0) throw new Error("Enter at least one delivery quantity.");
      return deliverSalesOrderFn({ data: { id: selected.id, lines } });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
      toast.success("Sales order delivery posted.");
      setSelected(result.data);
      setDeliveryQtys({});
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not deliver sales order.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelSalesOrderFn({ data: { id } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success("Sales order cancelled and reserved stock released.");
      setSelected(result.data);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not cancel sales order.");
    },
  });

  const orders = salesQuery.data ?? [];
  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;

    return orders.filter((order) =>
      [order.orderNumber, order.customer].some((value) => value.toLowerCase().includes(term)),
    );
  }, [orders, search]);

  const pipelineValue = filteredOrders.reduce((sum, order) => sum + order.amount, 0);
  const selectedRemainingQty = selected?.items.reduce((sum, item) => sum + Math.max(item.qty - item.deliveredQty, 0), 0) ?? 0;
  const products = productPickerQuery.data ?? [];
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const draftTotal = draftLines.reduce((sum, line) => {
    const product = productsById.get(line.productId);
    return sum + (product ? Number(line.qty || 0) * product.salesPrice : 0);
  }, 0);
  const canCreate = hasCreatePerm && customerName.trim().length > 0 && draftLines.some((line) => line.productId && Number(line.qty) > 0);

  return (
    <>
      <TopBar title="Sales Orders" breadcrumb="Pipeline" onNewOrder={() => setCreateOpen(true)} />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Sales Orders</h2>
            <p className="text-sm text-muted-foreground">{filteredOrders.length} orders / {formatINR(pipelineValue)} pipeline value</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search orders, customers..."
                className="h-8 pl-8 text-xs w-64 bg-card border-border/70"
              />
            </div>
            {canCreate && (
              <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 text-xs gap-1.5"><Plus className="size-3.5" /> New Order</Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {summaryStatuses.map((status) => (
            <Card key={status} className="p-4 border-border/70">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{status}</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">{orders.filter((order) => order.status === status).length}</div>
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
              {salesQuery.isLoading && Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-t border-border/60">
                  <td className="px-4 py-3" colSpan={6}>
                    <div className="h-4 rounded bg-muted/60 animate-pulse" />
                  </td>
                </tr>
              ))}
              {!salesQuery.isLoading && salesQuery.isError && (
                <tr className="border-t border-border/60">
                  <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                    Sales orders could not be loaded. Check the database connection and try again.
                  </td>
                </tr>
              )}
              {!salesQuery.isLoading && !salesQuery.isError && filteredOrders.length === 0 && (
                <tr className="border-t border-border/60">
                  <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                    No sales orders found.
                  </td>
                </tr>
              )}
              {!salesQuery.isLoading && !salesQuery.isError && filteredOrders.map((order) => (
                <tr key={order.id} onClick={() => setSelected(order)} className="border-t border-border/60 hover:bg-accent/40 cursor-pointer transition">
                  <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                  <td className="px-4 py-3 font-medium">{order.customer}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{formatINR(order.amount)}</td>
                  <td className="px-4 py-3"><Badge className={statusTone[order.status]}>{order.status}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{order.date}</td>
                  <td className="px-4 py-3"><ArrowRight className="size-3.5 text-muted-foreground" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-lg bg-card border-border overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {selected.orderNumber} / {selected.date}
                </div>
                <SheetTitle className="text-lg">{selected.customer}</SheetTitle>
                <div className="flex items-center gap-2">
                  <Badge className={statusTone[selected.status]}>{selected.status}</Badge>
                  <span className="text-lg font-semibold tabular-nums">{formatINR(selected.amount)}</span>
                </div>
              </SheetHeader>
              <div className="px-4 space-y-4">
                <div className="flex items-center gap-2">
                  {selected.status === "Draft" && canApprove && (
                    <Button
                      size="sm"
                      disabled={confirmMutation.isPending}
                      onClick={() => confirmMutation.mutate(selected.id)}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Sparkles className="size-3.5" /> Confirm and Run Procurement
                    </Button>
                  )}
                  {(selected.status === "Confirmed" || selected.status === "Partially Delivered") && selectedRemainingQty > 0 && (canWrite || (canEditOwn && selected.id)) && (
                    <Button
                      size="sm"
                      disabled={deliverMutation.isPending || !Object.values(deliveryQtys).some((q) => Number(q) > 0)}
                      onClick={() => deliverMutation.mutate()}
                      className="h-8 text-xs gap-1.5"
                    >
                      <CheckCircle2 className="size-3.5" /> Post Delivery
                    </Button>
                  )}
                  {(selected.status === "Draft" || selected.status === "Confirmed") && canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10">
                          <XCircle className="size-3.5" /> Cancel Order
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel {selected.orderNumber}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will cancel the sales order and release all reserved stock back to inventory. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Order</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate(selected.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Cancel Order
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Line items</div>
                  {selected.items.map((item) => {
                    const remaining = item.qty - item.deliveredQty;
                    const canDeliver = (selected.status === "Confirmed" || selected.status === "Partially Delivered") && remaining > 0;
                    return (
                      <div key={item.id} className="p-3 rounded-md border border-border/70 bg-background/40">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{item.name}</div>
                            <div className="text-[11px] font-mono text-muted-foreground">{item.sku}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm tabular-nums">{item.qty} x {formatINR(item.price)}</div>
                            <div className="text-[11px] text-muted-foreground tabular-nums">{formatINR(item.qty * item.price)}</div>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Delivered <span className="text-success font-medium tabular-nums">{item.deliveredQty}</span> / Reserved <span className="text-warning font-medium tabular-nums">{item.reservedQty}</span> / Remaining <span className="text-foreground font-medium tabular-nums">{remaining}</span></span>
                        </div>
                        {canDeliver && (canWrite || canEditOwn) && (
                          <div className="mt-2 flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max={remaining}
                              value={deliveryQtys[item.id] ?? ""}
                              onChange={(e) => setDeliveryQtys((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder={`0 — ${remaining}`}
                              className="h-7 text-xs w-28 bg-card tabular-nums"
                            />
                            <span className="text-[10px] text-muted-foreground">of {remaining} remaining</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 rounded-md border border-border/70 bg-background/40 space-y-2">
                  <div className="text-xs font-semibold flex items-center gap-2"><Factory className="size-3.5" /> Fulfillment Check</div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Required</span><span className="tabular-nums">{selected.items.reduce((sum, item) => sum + item.qty, 0)} units</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Reserved</span><span className="tabular-nums text-warning">{selected.items.reduce((sum, item) => sum + item.reservedQty, 0)} units</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Delivered</span><span className="tabular-nums text-success">{selected.items.reduce((sum, item) => sum + item.deliveredQty, 0)} units</span></div>
                </div>

                {selected.status === "Confirmed" && selected.items.some((item) => item.reservedQty < item.qty) && (
                  <div className="p-4 rounded-lg border border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent relative overflow-hidden">
                    <div className="flex items-start gap-3 relative">
                      <div className="size-8 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
                        <Sparkles className="size-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs uppercase tracking-wider text-primary font-medium">Automation</div>
                        <div className="text-sm font-semibold mt-0.5">Procurement was triggered for the shortage</div>
                        <p className="text-xs text-muted-foreground mt-1">FlowERP reserved available stock and created the required purchase or manufacturing order for the remaining quantity.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-md border border-border/70 bg-background/40">
                  <div className="text-xs font-semibold mb-2">Order Status</div>
                  <div className="space-y-2">
                    {[
                      { label: "Order created", ok: true },
                      { label: "Stock reserved", ok: selected.status !== "Draft" },
                      { label: "Procurement checked", ok: selected.status !== "Draft" },
                      { label: "Delivery posted", ok: selected.status === "Fully Delivered" || selected.status === "Partially Delivered" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2 text-xs">
                        {item.ok ? <CheckCircle2 className="size-3.5 text-success" /> : <AlertCircle className="size-3.5 text-muted-foreground" />}
                        <span className={item.ok ? "" : "text-muted-foreground"}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Sales Order</DialogTitle>
            <DialogDescription>
              Draft an order, then confirm it to reserve stock and trigger MTO procurement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Customer name"
                className="bg-background/40"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Order lines</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDraftLines((lines) => [...lines, makeDraftLine()])}
                  className="h-7 text-[11px]"
                >
                  <Plus className="mr-1 size-3" /> Add line
                </Button>
              </div>

              <div className="space-y-2">
                {draftLines.map((line, index) => {
                  const product = productsById.get(line.productId);
                  return (
                    <div key={line.key} className="grid grid-cols-[1fr_100px_34px] gap-2 rounded-md border border-border/70 bg-background/40 p-2">
                      <Select
                        value={line.productId || undefined}
                        onValueChange={(value) => {
                          setDraftLines((lines) => lines.map((item) => item.key === line.key ? { ...item, productId: value } : item));
                        }}
                      >
                        <SelectTrigger className="h-9 bg-card">
                          <SelectValue placeholder={productPickerQuery.isLoading ? "Loading products..." : "Select product"} />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.sku} / {item.name} / Free {item.freeToUse}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={line.qty}
                        onChange={(event) => setDraftLines((lines) => lines.map((item) => item.key === line.key ? { ...item, qty: event.target.value } : item))}
                        type="number"
                        min="1"
                        step="1"
                        className="h-9 bg-card text-right"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={draftLines.length === 1}
                        onClick={() => setDraftLines((lines) => lines.filter((item) => item.key !== line.key))}
                        className="size-9 p-0"
                        aria-label={`Remove line ${index + 1}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      {product && (
                        <div className="col-span-3 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                          <span>{product.procurement} / {product.vendorName ?? "Internal production"}</span>
                          <span className="tabular-nums">{formatINR(product.salesPrice)} x {Number(line.qty || 0)} = {formatINR(Number(line.qty || 0) * product.salesPrice)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/70 bg-background/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Draft total</span>
              <span className="font-semibold tabular-nums">{formatINR(draftTotal)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!canCreate || createMutation.isPending} onClick={() => createMutation.mutate()}>
              Create Draft Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
