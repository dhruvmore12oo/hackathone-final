import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Clock, CheckCircle2, Circle, ListTree, Calendar, GitBranch, Play, PackageCheck, XCircle, LayoutList, KanbanSquare } from "lucide-react";

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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  { key: "Cancelled", label: "Cancelled", icon: XCircle, tone: "text-destructive" },
];

const kanbanColumns = ["Draft", "In Progress", "Completed", "Cancelled"] as const;

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
  const [viewMode, setViewMode] = useState<"list" | "kanban">(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("mo-view-mode") as "list" | "kanban") || "list";
    return "list";
  });
  const handleViewChange = (mode: string) => {
    if (!mode) return;
    setViewMode(mode as "list" | "kanban");
    localStorage.setItem("mo-view-mode", mode);
  };
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
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={viewMode} onValueChange={handleViewChange} className="bg-card border border-border/70 rounded-md p-0.5">
              <ToggleGroupItem value="list" className="h-7 px-2 text-xs data-[state=on]:bg-muted"><LayoutList className="size-3.5 mr-1" /> List</ToggleGroupItem>
              <ToggleGroupItem value="kanban" className="h-7 px-2 text-xs data-[state=on]:bg-muted"><KanbanSquare className="size-3.5 mr-1" /> Kanban</ToggleGroupItem>
            </ToggleGroup>
            {hasCreatePerm && (
              <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 text-xs gap-1.5"><Plus className="size-3.5" /> New MO</Button>
            )}
          </div>
        </div>

        {viewMode === "list" ? (
          <Card className="border-border/70 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">MO Number</th>
                  <th className="px-4 py-2.5 font-medium">Product</th>
                  <th className="px-4 py-2.5 font-medium text-right">Qty</th>
                  <th className="px-4 py-2.5 font-medium">Progress</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {manufacturingQuery.isLoading && Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index} className="border-t border-border/60">
                    <td className="px-4 py-3" colSpan={6}>
                      <div className="h-4 rounded bg-muted/60 animate-pulse" />
                    </td>
                  </tr>
                ))}
                {!manufacturingQuery.isLoading && orders.length === 0 && (
                  <tr className="border-t border-border/60">
                    <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                      No manufacturing orders found.
                    </td>
                  </tr>
                )}
                {!manufacturingQuery.isLoading && orders.map((order) => (
                  <tr key={order.id} onClick={() => setSelected(order)} className="border-t border-border/60 hover:bg-accent/40 cursor-pointer transition">
                    <td className="px-4 py-3 font-mono text-xs">{order.moNumber}</td>
                    <td className="px-4 py-3 font-medium">{order.product}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{order.qty}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={order.progress} className="h-1.5 w-16" />
                        <span className="text-xs text-muted-foreground tabular-nums">{order.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge className={statusTone[order.status]}>{order.status}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{order.due || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap pb-4">
            <div className="flex gap-4 min-w-max h-[70vh]">
              {kanbanColumns.map(status => {
                const columnOrders = orders.filter(o => o.status === status);
                return (
                  <div key={status} className="w-[320px] max-w-[400px] shrink-0 flex flex-col gap-3 bg-muted/20 rounded-xl p-3 border border-border/50 h-full overflow-hidden flex-1">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                        <Badge variant="outline" className={`border-0 w-2 h-2 p-0 rounded-full ${statusTone[status].split(" ")[0]}`} />
                        {status}
                      </h3>
                      <Badge variant="secondary" className="text-xs bg-background">{columnOrders.length}</Badge>
                    </div>
                    
                    <ScrollArea className="flex-1 -mx-1 px-1">
                      <div className="flex flex-col gap-3 pb-2">
                        {columnOrders.map(order => (
                          <Card key={order.id} onClick={() => setSelected(order)} className="p-3 border-border/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer whitespace-normal flex flex-col gap-3 group relative cursor-grab active:cursor-grabbing">
                            <div className="flex items-start justify-between">
                              <span className="text-xs font-mono text-muted-foreground">{order.moNumber}</span>
                              <Badge className={`${statusTone[order.status]} shrink-0 px-1.5 py-0`}>{order.status}</Badge>
                            </div>
                            <div>
                              <div className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">{order.product}</div>
                              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                                Qty: <span className="tabular-nums font-medium text-foreground">{order.qty}</span>
                              </div>
                            </div>
                            {order.status === "In Progress" && (
                              <div className="mt-1">
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                  <span>Progress</span><span className="tabular-nums text-foreground">{order.progress}%</span>
                                </div>
                                <Progress value={order.progress} className="h-1.5" />
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-1 pt-3 border-t border-border/40">
                              <span className="text-[10px] text-muted-foreground tabular-nums">{order.due || "No deadline"}</span>
                              <span className="text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">View Details</span>
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
