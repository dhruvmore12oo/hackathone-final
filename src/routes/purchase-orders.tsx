import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, CheckCircle2, PackageCheck, Trash2, XCircle, FileText, Package, LayoutList, KanbanSquare } from "lucide-react";

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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getCurrentUserProfile } from "@/lib/api/auth.functions";
import { listProducts } from "@/lib/api/products.functions";
import { cancelPurchaseOrder, requestPurchaseApproval, approvePurchaseOrder, createPurchaseOrder, listPurchaseOrders, receivePurchaseOrder, type PurchaseOrderListItem, type PurchaseOrderStatusLabel } from "@/lib/api/purchase.functions";
import { listVendors } from "@/lib/api/vendors.functions";
import { formatINR } from "@/lib/formatters";

export const Route = createFileRoute("/purchase-orders")({
  head: () => ({ meta: [{ title: "Purchase Orders - FlowERP" }] }),
  component: POPage,
});

const tone: Record<PurchaseOrderStatusLabel, string> = {
  Draft: "bg-muted text-muted-foreground border-border text-[10px]",
  "Pending Approval": "bg-warning/20 text-warning-foreground border-warning/30 text-[10px]",
  Approved: "bg-primary/20 text-primary-foreground border-primary/30 text-[10px]",
  Confirmed: "bg-info/10 text-info border-info/20 text-[10px]",
  "Partially Received": "bg-warning/15 text-warning border-warning/20 text-[10px]",
  "Fully Received": "bg-success/15 text-success border-success/20 text-[10px]",
  Cancelled: "bg-destructive/15 text-destructive border-destructive/20 text-[10px]",
};

function makeDraftLine() {
  return {
    key: Math.random().toString(36).slice(2),
    productId: "",
    qty: "1",
  };
}

const summaryStatuses = ["Draft", "Pending Approval", "Approved", "Confirmed", "Partially Received", "Fully Received", "Cancelled"] as const;

function POPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "kanban">(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("po-view-mode") as "list" | "kanban") || "list";
    return "list";
  });
  const handleViewChange = (mode: string) => {
    if (!mode) return;
    setViewMode(mode as "list" | "kanban");
    localStorage.setItem("po-view-mode", mode);
  };
  const [vendorId, setVendorId] = useState("");
  const handleVendorChange = (id: string) => {
    setVendorId(id);
    setDraftLines([makeDraftLine()]);
  };
  const [draftLines, setDraftLines] = useState([makeDraftLine()]);
  const [selected, setSelected] = useState<PurchaseOrderListItem | null>(null);
  const [receivingPO, setReceivingPO] = useState<PurchaseOrderListItem | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({});
  const listPurchaseOrdersFn = useServerFn(listPurchaseOrders);
  const listProductsFn = useServerFn(listProducts);
  const listVendorsFn = useServerFn(listVendors);
  const createPurchaseOrderFn = useServerFn(createPurchaseOrder);
  const requestApprovalFn = useServerFn(requestPurchaseApproval);
  const approvePurchaseOrderFn = useServerFn(approvePurchaseOrder);
  const receivePurchaseOrderFn = useServerFn(receivePurchaseOrder);
  const cancelPurchaseOrderFn = useServerFn(cancelPurchaseOrder);
  const poQuery = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => listPurchaseOrdersFn(),
  });

  const getCurrentUserProfileFn = useServerFn(getCurrentUserProfile);
  const profileQuery = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: () => getCurrentUserProfileFn(),
  });
  const permissions = profileQuery.data?.permissions || [];
  const can = (p: string) => permissions.includes("*") || permissions.includes(p);
  const canWrite = can("purchase:write");
  const hasCreatePerm = canWrite || can("purchase:create");
  const canApprove = can("approvals:manage") || can("*");
  const canDelete = canWrite || can("purchase:delete");
  const canEditOwn = canWrite || can("purchase:edit_own");

  const productsQuery = useQuery({
    queryKey: ["purchase-product-picker"],
    queryFn: () => listProductsFn({ data: { category: "All", search: "" } }),
  });

  const vendorsQuery = useQuery({
    queryKey: ["vendors"],
    queryFn: () => listVendorsFn(),
  });

  const createMutation = useMutation({
    mutationFn: () => createPurchaseOrderFn({
      data: {
        vendorId,
        lines: draftLines
          .filter((line) => line.productId && Number(line.qty) > 0)
          .map((line) => ({ productId: line.productId, qty: Number(line.qty) })),
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success("Purchase order created.");
      setCreateOpen(false);
      setVendorId("");
      setDraftLines([makeDraftLine()]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create purchase order.");
    },
  });

  const requestMutation = useMutation({
    mutationFn: (id: string) => requestApprovalFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Approval requested successfully.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not request approval.");
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approvePurchaseOrderFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success("Purchase order approved and confirmed.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not approve purchase order.");
    },
  });

  const receiveMutation = useMutation({
    mutationFn: () => {
      if (!receivingPO) throw new Error("No PO selected.");
      const lines = receivingPO.lines
        .map((line) => ({
          lineId: line.id,
          receivedQty: Number(receiveQtys[line.id] || 0),
        }))
        .filter((line) => line.receivedQty > 0);
      if (lines.length === 0) throw new Error("Enter at least one receive quantity.");
      return receivePurchaseOrderFn({ data: { id: receivingPO.id, lines } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success("Goods received and stock updated.");
      setReceivingPO(null);
      setReceiveQtys({});
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not receive goods.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelPurchaseOrderFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success("Purchase order cancelled.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not cancel purchase order.");
    },
  });

  const pos = poQuery.data ?? [];
  const allProducts = productsQuery.data ?? [];
  const rawMaterials = useMemo(() => allProducts.filter((p) => p.procurement === "Buy"), [allProducts]);
  const vendorProducts = useMemo(
    () => vendorId ? rawMaterials.filter((p) => p.vendorId === vendorId) : rawMaterials,
    [rawMaterials, vendorId]
  );
  const products = vendorProducts;
  const productsById = useMemo(() => new Map(allProducts.map((product) => [product.id, product])), [allProducts]);
  const draftTotal = draftLines.reduce((sum, line) => {
    const product = productsById.get(line.productId);
    return sum + (product ? Number(line.qty || 0) * product.costPrice : 0);
  }, 0);
  const canSubmit = vendorId && draftLines.some((line) => line.productId && Number(line.qty) > 0);

  return (
    <>
      <TopBar title="Purchase Orders" breadcrumb="Procurement" />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Purchase Orders</h2>
            <p className="text-sm text-muted-foreground">{pos.length} active POs / {formatINR(pos.reduce((sum, order) => sum + order.amount, 0))} committed</p>
          </div>
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={viewMode} onValueChange={handleViewChange} className="bg-card border border-border/70 rounded-md p-0.5">
              <ToggleGroupItem value="list" className="h-7 px-2 text-xs data-[state=on]:bg-muted"><LayoutList className="size-3.5 mr-1" /> List</ToggleGroupItem>
              <ToggleGroupItem value="kanban" className="h-7 px-2 text-xs data-[state=on]:bg-muted"><KanbanSquare className="size-3.5 mr-1" /> Kanban</ToggleGroupItem>
            </ToggleGroup>
            {hasCreatePerm && (
              <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 text-xs gap-1.5"><Plus className="size-3.5" /> Create Purchase Order</Button>
            )}
          </div>
        </div>
        {viewMode === "list" ? (
          <Card className="border-border/70 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">PO</th>
                  <th className="px-4 py-2.5 font-medium">Vendor</th>
                  <th className="px-4 py-2.5 font-medium">Item</th>
                  <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Source</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {poQuery.isLoading && Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-t border-border/60">
                    <td className="px-4 py-3" colSpan={8}>
                      <div className="h-4 rounded bg-muted/60 animate-pulse" />
                    </td>
                  </tr>
                ))}
                {!poQuery.isLoading && poQuery.isError && (
                  <tr className="border-t border-border/60">
                    <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={8}>
                      Purchase orders could not be loaded. Check the database connection and try again.
                    </td>
                  </tr>
                )}
                {!poQuery.isLoading && !poQuery.isError && pos.length === 0 && (
                  <tr className="border-t border-border/60">
                    <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={8}>
                      No purchase orders found.
                    </td>
                  </tr>
                )}
                {!poQuery.isLoading && !poQuery.isError && pos.map((order) => (
                  <tr key={order.id} className="border-t border-border/60 hover:bg-accent/40 transition cursor-pointer" onClick={() => setSelected(order)}>
                    <td className="px-4 py-3 font-mono text-xs">{order.poNumber}</td>
                    <td className="px-4 py-3">{order.vendor}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{order.itemSummary}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatINR(order.amount)}</td>
                    <td className="px-4 py-3"><Badge className={tone[order.status]}>{order.status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] border-border/70">{order.sourceType}</Badge>
                        {order.sourceSoNumber && (
                          <span className="text-[10px] font-mono text-muted-foreground">← {order.sourceSoNumber}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{order.date}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {order.status === "Draft" && canWrite && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={requestMutation.isPending}
                          onClick={() => requestMutation.mutate(order.id)}
                          className="h-7 text-[11px] gap-1.5"
                        >
                          <CheckCircle2 className="size-3" /> Request Approval
                        </Button>
                      )}
                      {order.status === "Pending Approval" && canApprove && (
                        <Button
                          size="sm"
                          variant="default"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(order.id)}
                          className="h-7 text-[11px] gap-1.5"
                        >
                          <CheckCircle2 className="size-3" /> Approve
                        </Button>
                      )}
                      {(order.status === "Approved" || order.status === "Confirmed" || order.status === "Partially Received") && (canWrite || canEditOwn) && (
                        <Button
                          size="sm"
                          disabled={receiveMutation.isPending}
                          onClick={() => { setReceivingPO(order); setReceiveQtys({}); }}
                          className="h-7 text-[11px] gap-1.5"
                        >
                          <PackageCheck className="size-3" /> Receive
                        </Button>
                      )}
                      {(order.status === "Draft" || order.status === "Pending Approval" || order.status === "Confirmed") && canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10">
                              <XCircle className="size-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel {order.poNumber}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will cancel the purchase order. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep PO</AlertDialogCancel>
                              <AlertDialogAction
                                disabled={cancelMutation.isPending}
                                onClick={() => { cancelMutation.mutate(order.id); setSelected(null); }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Cancel PO
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap pb-4">
            <div className="flex gap-4 min-w-max h-[70vh]">
              {summaryStatuses.map(status => {
                const columnOrders = pos.filter(o => o.status === status);
                return (
                  <div key={status} className="w-[320px] max-w-[400px] shrink-0 flex flex-col gap-3 bg-muted/20 rounded-xl p-3 border border-border/50 h-full overflow-hidden flex-1">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                        <Badge variant="outline" className={`border-0 w-2 h-2 p-0 rounded-full ${tone[status].split(" ")[0]}`} />
                        {status}
                      </h3>
                      <Badge variant="secondary" className="text-xs bg-background">{columnOrders.length}</Badge>
                    </div>
                    
                    <ScrollArea className="flex-1 -mx-1 px-1">
                      <div className="flex flex-col gap-3 pb-2">
                        {columnOrders.map(order => (
                          <Card key={order.id} onClick={() => setSelected(order)} className="p-3 border-border/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer whitespace-normal flex flex-col gap-3 group relative cursor-grab active:cursor-grabbing">
                            <div className="flex items-start justify-between">
                              <span className="text-xs font-mono text-muted-foreground">{order.poNumber}</span>
                              <Badge className={`${tone[order.status]} shrink-0 px-1.5 py-0`}>{order.status}</Badge>
                            </div>
                            <div>
                              <div className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">{order.vendor}</div>
                              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                                <span className="tabular-nums font-medium text-foreground">{formatINR(order.amount)}</span> • {order.sourceType}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-1 pt-3 border-t border-border/40">
                              <span className="text-[10px] text-muted-foreground tabular-nums">{order.date}</span>
                              <span className="text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">View Actions</span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </main>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-md bg-card border-border overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">{selected.sourceType} Order</div>
                <SheetTitle className="text-lg flex items-center gap-2">
                  <FileText className="size-5" /> {selected.poNumber}
                </SheetTitle>
                <div className="text-xs text-muted-foreground">{selected.date}</div>
              </SheetHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-md border border-border/70 bg-background/40">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Vendor</div>
                    <div className="text-sm font-medium mt-1">{selected.vendor}</div>
                  </div>
                  <div className="p-3 rounded-md border border-border/70 bg-background/40">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</div>
                    <div className="mt-1"><Badge className={tone[selected.status]}>{selected.status}</Badge></div>
                  </div>
                  {selected.sourceSoNumber && (
                    <div className="p-3 rounded-md border border-border/70 bg-background/40 col-span-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Source Document</div>
                      <div className="text-sm font-medium mt-1 font-mono">Sales Order {selected.sourceSoNumber}</div>
                    </div>
                  )}
                  <div className="p-3 rounded-md border border-border/70 bg-background/40 col-span-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Amount</div>
                    <div className="text-lg font-semibold tabular-nums mt-1">{formatINR(selected.amount)}</div>
                  </div>
                </div>

                <div className="p-3 rounded-md border border-border/70 bg-background/40">
                  <div className="text-xs font-semibold flex items-center gap-2 mb-3"><Package className="size-3.5" /> Order Lines</div>
                  <div className="space-y-3">
                    {selected.lines.map((line) => (
                      <div key={line.id} className="text-xs border-b border-border/40 pb-2 last:border-0 last:pb-0">
                        <div className="font-medium mb-1">{line.name} <span className="text-[10px] text-muted-foreground font-mono ml-1">{line.sku}</span></div>
                        <div className="flex justify-between text-muted-foreground">
                          <span className="tabular-nums">Qty: {line.orderedQty} (Rec: {line.receivedQty})</span>
                          <span className="tabular-nums">{formatINR(line.unitCost)}</span>
                        </div>
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
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              Draft a vendor order, then confirm and receive it to update stock.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={vendorId || undefined} onValueChange={handleVendorChange}>
                <SelectTrigger className="bg-background/40">
                  <SelectValue placeholder={vendorsQuery.isLoading ? "Loading vendors..." : "Select vendor"} />
                </SelectTrigger>
                <SelectContent>
                  {(vendorsQuery.data ?? []).map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Raw Materials</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {!vendorId ? "Select a vendor first" : products.length === 0 ? "No raw materials linked to this vendor" : `${products.length} raw material${products.length !== 1 ? "s" : ""} available from this vendor`}
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" disabled={!vendorId} onClick={() => setDraftLines((lines) => [...lines, makeDraftLine()])} className="h-7 text-[11px]">
                  <Plus className="mr-1 size-3" /> Add line
                </Button>
              </div>
              <div className="space-y-2">
                {draftLines.map((line, index) => {
                  const product = productsById.get(line.productId);
                  return (
                    <div key={line.key} className="grid grid-cols-[1fr_100px_34px] gap-2 rounded-md border border-border/70 bg-background/40 p-2">
                      <Select value={line.productId || undefined} onValueChange={(value) => setDraftLines((lines) => lines.map((item) => item.key === line.key ? { ...item, productId: value } : item))}>
                        <SelectTrigger className="h-9 bg-card">
                          <SelectValue placeholder={!vendorId ? "Select a vendor first" : productsQuery.isLoading ? "Loading..." : "Select raw material"} />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              <span className="font-mono text-[11px] text-muted-foreground mr-1.5">{item.sku}</span>
                              {item.name}
                              <span className="text-muted-foreground ml-1.5">· {formatINR(item.costPrice)}/{item.unit}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input value={line.qty} onChange={(event) => setDraftLines((lines) => lines.map((item) => item.key === line.key ? { ...item, qty: event.target.value } : item))} type="number" min="1" step="1" className="h-9 bg-card text-right" />
                      <Button type="button" variant="ghost" size="sm" disabled={draftLines.length === 1} onClick={() => setDraftLines((lines) => lines.filter((item) => item.key !== line.key))} className="size-9 p-0" aria-label={`Remove line ${index + 1}`}>
                        <Trash2 className="size-4" />
                      </Button>
                      {product && (
                        <div className="col-span-3 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                          <span>{product.sku}</span>
                          <span className="tabular-nums">{formatINR(product.costPrice)} x {Number(line.qty || 0)} = {formatINR(Number(line.qty || 0) * product.costPrice)}</span>
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
            <Button disabled={!canSubmit || createMutation.isPending} onClick={() => createMutation.mutate()}>
              Create Draft PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receivingPO} onOpenChange={(open) => { if (!open) { setReceivingPO(null); setReceiveQtys({}); } }}>
        <DialogContent className="bg-card border-border sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receive Goods — {receivingPO?.poNumber}</DialogTitle>
            <DialogDescription>
              Enter the quantity received for each line item. You can do a partial receipt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {receivingPO?.lines.map((line) => {
              const remaining = line.orderedQty - line.receivedQty;
              if (remaining <= 0) return null;
              return (
                <div key={line.id} className="p-3 rounded-md border border-border/70 bg-background/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{line.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{line.sku}</div>
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground tabular-nums">
                      Ordered {line.orderedQty} / Received {line.receivedQty} / Remaining {remaining}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max={remaining}
                      value={receiveQtys[line.id] ?? ""}
                      onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [line.id]: e.target.value }))}
                      placeholder={`0 — ${remaining}`}
                      className="h-7 text-xs w-28 bg-card tabular-nums"
                    />
                    <span className="text-[10px] text-muted-foreground">of {remaining} remaining</span>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setReceivingPO(null); setReceiveQtys({}); }}>Cancel</Button>
            <Button
              disabled={receiveMutation.isPending || !Object.values(receiveQtys).some((q) => Number(q) > 0)}
              onClick={() => receiveMutation.mutate()}
            >
              Post Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
