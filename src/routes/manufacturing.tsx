import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Clock, CheckCircle2, Circle, ListTree, Calendar, GitBranch, Play, PackageCheck, XCircle } from "lucide-react";

import { TopBar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getCurrentUserProfile } from "@/lib/api/auth.functions";
import { listProducts } from "@/lib/api/products.functions";
import {
  cancelManufacturingOrder,
  completeManufacturingOrder,
  createManufacturingOrder,
  listManufacturingOrders,
  startManufacturingOrder,
  updateWorkOrderStatus,
  type ManufacturingOrderListItem,
  type ManufacturingOrderStatusLabel,
} from "@/lib/api/manufacturing.functions";

export const Route = createFileRoute("/manufacturing")({
  head: () => ({ meta: [{ title: "Manufacturing - FlowERP" }] }),
  component: ManufacturingPage,
});

const columns: { key: ManufacturingOrderStatusLabel; label: string; icon: any; tone: string }[] = [
  { key: "Draft", label: "Draft", icon: Circle, tone: "text-muted-foreground" },
  { key: "In Progress", label: "In Progress", icon: Clock, tone: "text-warning" },
  { key: "Completed", label: "Completed", icon: CheckCircle2, tone: "text-success" },
];

const statusTone: Record<ManufacturingOrderStatusLabel, string> = {
  Draft: "bg-muted text-muted-foreground border-border text-[10px]",
  "In Progress": "bg-warning/15 text-warning border-warning/20 text-[10px]",
  Completed: "bg-success/15 text-success border-success/20 text-[10px]",
  Cancelled: "bg-destructive/15 text-destructive border-destructive/20 text-[10px]",
};

function ManufacturingPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ManufacturingOrderListItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [moForm, setMoForm] = useState({ productId: "", qty: "1", scheduledDate: "" });
  const listManufacturingOrdersFn = useServerFn(listManufacturingOrders);
  const listProductsFn = useServerFn(listProducts);
  const createManufacturingOrderFn = useServerFn(createManufacturingOrder);
  const startManufacturingOrderFn = useServerFn(startManufacturingOrder);
  const completeManufacturingOrderFn = useServerFn(completeManufacturingOrder);
  const cancelManufacturingOrderFn = useServerFn(cancelManufacturingOrder);
  const updateWorkOrderStatusFn = useServerFn(updateWorkOrderStatus);

  const manufacturingQuery = useQuery({
    queryKey: ["manufacturing-orders"],
    queryFn: () => listManufacturingOrdersFn(),
  });

  const getCurrentUserProfileFn = useServerFn(getCurrentUserProfile);
  const profileQuery = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: () => getCurrentUserProfileFn(),
  });
  const permissions = profileQuery.data?.permissions || [];
  const can = (p: string) => permissions.includes("*") || permissions.includes(p);
  const canWrite = can("manufacturing:write");
  const hasCreatePerm = canWrite || can("manufacturing:production_entry");
  const hasUpdatePerm = canWrite || can("manufacturing:update_progress");
  const hasCompletePerm = canWrite || can("manufacturing:complete_wo");
  const hasDeletePerm = canWrite || can("manufacturing:delete");

  const productsQuery = useQuery({
    queryKey: ["manufacturing-product-picker"],
    queryFn: () => listProductsFn({ data: { category: "All", search: "" } }),
  });

  const createMutation = useMutation({
    mutationFn: () => createManufacturingOrderFn({
      data: {
        productId: moForm.productId,
        qty: Number(moForm.qty),
        scheduledDate: moForm.scheduledDate || null,
      },
    }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturing-orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success(`${result.data.moNumber} created.`);
      setSelected(result.data);
      setCreateOpen(false);
      setMoForm({ productId: "", qty: "1", scheduledDate: "" });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create manufacturing order.");
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => startManufacturingOrderFn({ data: { id } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturing-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
      toast.success("Manufacturing order started and components reserved.");
      setSelected(result.data);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not start manufacturing order.");
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => completeManufacturingOrderFn({ data: { id } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturing-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Manufacturing completed and stock updated.");
      setSelected(result.data);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not complete manufacturing order.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelManufacturingOrderFn({ data: { id } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturing-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success("Manufacturing order cancelled and components released.");
      setSelected(result.data);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not cancel manufacturing order.");
    },
  });

  const woMutation = useMutation({
    mutationFn: ({ workOrderId, action }: { workOrderId: string; action: "start" | "complete" }) =>
      updateWorkOrderStatusFn({ data: { workOrderId, action } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturing-orders"] });
      toast.success("Work order updated.");
      setSelected(result.data);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update work order.");
    },
  });

  const orders = manufacturingQuery.data ?? [];
  const manufacturedProducts = (productsQuery.data ?? []).filter((product) => product.procurement === "Manufacture");
  const canCreate = hasCreatePerm && moForm.productId && Number(moForm.qty) > 0;

  return (
    <>
      <TopBar title="Manufacturing" breadcrumb="Work Orders" />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Manufacturing Board</h2>
            <p className="text-sm text-muted-foreground">{orders.length} work orders across 3 stages</p>
          </div>
          {hasCreatePerm && (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 text-xs gap-1.5"><Plus className="size-3.5" /> New MO</Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {columns.map((column) => {
            const cards = orders.filter((order) => order.status === column.key);
            return (
              <div key={column.key} className="rounded-lg border border-border/70 bg-card/40">
                <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <column.icon className={`size-3.5 ${column.tone}`} />
                    <span className="text-xs font-semibold">{column.label}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{cards.length}</span>
                  </div>
                  {hasCreatePerm && (
                    <Button size="sm" variant="ghost" onClick={() => setCreateOpen(true)} className="size-6 p-0"><Plus className="size-3.5" /></Button>
                  )}
                </div>
                <div className="p-2 space-y-2 min-h-[400px]">
                  {manufacturingQuery.isLoading && Array.from({ length: 2 }).map((_, index) => (
                    <Card key={index} className="p-3 border-border/70 bg-card">
                      <div className="h-20 rounded bg-muted/60 animate-pulse" />
                    </Card>
                  ))}
                  {!manufacturingQuery.isLoading && cards.length === 0 && (
                    <div className="p-4 text-xs text-muted-foreground">No orders in this stage.</div>
                  )}
                  {!manufacturingQuery.isLoading && cards.map((order) => (
                    <Card key={order.id} onClick={() => setSelected(order)} className="p-3 border-border/70 hover:border-primary/40 cursor-pointer transition bg-card">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-muted-foreground">{order.moNumber}</span>
                        {order.linkedSO && <Badge variant="outline" className="text-[9px] border-border/70 px-1.5 py-0">{order.linkedSO}</Badge>}
                      </div>
                      <div className="mt-2 text-sm font-medium leading-tight">{order.product}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Qty <span className="text-foreground tabular-nums">{order.qty}</span>{order.due ? ` / Due ${order.due.slice(5)}` : ""}</div>
                      {order.status === "In Progress" && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Progress</span><span className="tabular-nums text-foreground">{order.progress}%</span>
                          </div>
                          <Progress value={order.progress} className="h-1.5" />
                        </div>
                      )}
                      {order.status === "Completed" && (
                        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-success"><CheckCircle2 className="size-3" /> Stock updated</div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-lg bg-card border-border overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">{selected.moNumber} / {selected.sku}</div>
                <SheetTitle className="text-lg">{selected.product}</SheetTitle>
                <div className="flex items-center gap-2">
                  <Badge className={statusTone[selected.status]}>{selected.status}</Badge>
                  <span className="text-xs text-muted-foreground">Qty <span className="text-foreground font-medium tabular-nums">{selected.qty}</span></span>
                  {selected.due && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="size-3" /> {selected.due}</span>}
                </div>
              </SheetHeader>
              <div className="px-4 space-y-4">
                <div className="flex items-center gap-2">
                  {selected.status === "Draft" && hasUpdatePerm && (
                    <Button
                      size="sm"
                      disabled={startMutation.isPending}
                      onClick={() => startMutation.mutate(selected.id)}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Play className="size-3.5" /> Start MO
                    </Button>
                  )}
                  {selected.status === "In Progress" && hasCompletePerm && (
                    <Button
                      size="sm"
                      disabled={completeMutation.isPending}
                      onClick={() => completeMutation.mutate(selected.id)}
                      className="h-8 text-xs gap-1.5"
                    >
                      <PackageCheck className="size-3.5" /> Complete MO
                    </Button>
                  )}
                  {(selected.status === "Draft" || selected.status === "In Progress") && hasDeletePerm && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10">
                          <XCircle className="size-3.5" /> Cancel MO
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel {selected.moNumber}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will cancel the manufacturing order, release all reserved component stock, and cancel pending work orders. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep MO</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate(selected.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Cancel MO
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                <div className="p-3 rounded-md border border-border/70 bg-background/40">
                  <div className="text-xs font-semibold flex items-center gap-2 mb-2"><ListTree className="size-3.5" /> Bill of Materials</div>
                  <div className="space-y-2">
                    {selected.components.map((component) => (
                      <div key={component.id} className="flex items-center justify-between text-xs">
                        <span>{component.name}</span>
                        <span className="text-muted-foreground tabular-nums">x {component.requiredQty}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-md border border-border/70 bg-background/40">
                  <div className="text-xs font-semibold flex items-center gap-2 mb-2"><GitBranch className="size-3.5" /> Work Orders</div>
                  <div className="space-y-2">
                    {selected.workOrders.map((workOrder) => {
                      const hasInProgress = selected.workOrders.some((wo) => wo.id !== workOrder.id && wo.status === "IN_PROGRESS");
                      const canStart = selected.status === "In Progress" && workOrder.status === "PENDING" && !hasInProgress;
                      const canComplete = selected.status === "In Progress" && workOrder.status === "IN_PROGRESS";
                      return (
                        <div key={workOrder.id} className="flex items-center justify-between text-xs p-2 rounded-md border border-border/50 bg-card/60">
                          <div className="flex items-center gap-2">
                            {workOrder.status === "COMPLETED" ? <CheckCircle2 className="size-3.5 text-success" /> : workOrder.status === "IN_PROGRESS" ? <Clock className="size-3.5 text-warning animate-pulse" /> : workOrder.status === "CANCELLED" ? <XCircle className="size-3.5 text-destructive" /> : <Circle className="size-3.5 text-muted-foreground" />}
                            <div>
                              <span className="font-medium">{workOrder.name}</span>
                              <span className="text-[10px] text-muted-foreground ml-1.5">{workOrder.durationMins}m</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {canStart && hasUpdatePerm && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={woMutation.isPending}
                                onClick={() => woMutation.mutate({ workOrderId: workOrder.id, action: "start" })}
                                className="h-6 px-2 text-[10px] gap-1"
                              >
                                <Play className="size-2.5" /> Start
                              </Button>
                            )}
                            {canComplete && hasCompletePerm && (
                              <Button
                                size="sm"
                                disabled={woMutation.isPending}
                                onClick={() => woMutation.mutate({ workOrderId: workOrder.id, action: "complete" })}
                                className="h-6 px-2 text-[10px] gap-1"
                              >
                                <CheckCircle2 className="size-2.5" /> Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 rounded-md border border-border/70 bg-background/40">
                  <div className="text-xs font-semibold mb-3">Component Status</div>
                  <div className="space-y-2">
                    {selected.components.map((component) => (
                      <div key={component.id} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-muted-foreground">{component.sku}</span>
                        <span className="tabular-nums">Reserved {component.reservedQty} / Consumed {component.consumedQty}</span>
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
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create Manufacturing Order</DialogTitle>
            <DialogDescription>
              Create a draft MO from the product BoM, including components and work orders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Manufactured Product</Label>
              <Select value={moForm.productId || undefined} onValueChange={(value) => setMoForm((form) => ({ ...form, productId: value }))}>
                <SelectTrigger className="bg-background/40">
                  <SelectValue placeholder={productsQuery.isLoading ? "Loading products..." : "Select product"} />
                </SelectTrigger>
                <SelectContent>
                  {manufacturedProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>{product.sku} / {product.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="moQty">Quantity</Label>
                <Input id="moQty" type="number" min="1" value={moForm.qty} onChange={(event) => setMoForm((form) => ({ ...form, qty: event.target.value }))} className="bg-background/40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moDate">Scheduled Date</Label>
                <Input id="moDate" type="date" value={moForm.scheduledDate} onChange={(event) => setMoForm((form) => ({ ...form, scheduledDate: event.target.value }))} className="bg-background/40" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!canCreate || createMutation.isPending} onClick={() => createMutation.mutate()}>
              Create MO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
