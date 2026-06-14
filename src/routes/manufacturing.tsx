import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Clock, CheckCircle2, Circle, ListTree, Calendar, GitBranch, Play, PackageCheck, XCircle, LayoutList, KanbanSquare, AlertTriangle, Factory, Box, AlertCircle, ArrowRight } from "lucide-react";

import { TopBar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUserProfile } from "@/lib/api/auth.functions";
import { listProducts } from "@/lib/api/products.functions";
import { getBomByProduct } from "@/lib/api/bom.functions";
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

      <CreateManufacturingOrderDialog 
        open={createOpen} 
        onOpenChange={setCreateOpen} 
        productsQuery={productsQuery} 
        manufacturedProducts={manufacturedProducts}
        hasCreatePerm={hasCreatePerm}
        onSuccess={(mo) => setSelected(mo)}
      />
    </>
  );
}

function CreateManufacturingOrderDialog({
  open,
  onOpenChange,
  productsQuery,
  manufacturedProducts,
  hasCreatePerm,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productsQuery: any;
  manufacturedProducts: any[];
  hasCreatePerm: boolean;
  onSuccess: (mo: any) => void;
}) {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [scheduledDate, setScheduledDate] = useState("");
  const [activeTab, setActiveTab] = useState("work-orders");

  const getBomByProductFn = useServerFn(getBomByProduct);
  const createManufacturingOrderFn = useServerFn(createManufacturingOrder);

  const bomQuery = useQuery({
    queryKey: ["bom", productId],
    queryFn: () => getBomByProductFn({ data: { productId } }),
    enabled: !!productId,
  });

  const createMutation = useMutation({
    mutationFn: () => createManufacturingOrderFn({
      data: {
        productId,
        qty: Number(qty),
        scheduledDate: scheduledDate || null,
      },
    }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturing-orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success(`${result.data.moNumber} created.`);
      onSuccess(result.data);
      handleClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create manufacturing order.");
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setProductId("");
      setQty("1");
      setScheduledDate("");
      setActiveTab("work-orders");
    }, 200);
  };

  const bom = bomQuery.data;
  const isLoading = bomQuery.isLoading || bomQuery.isFetching;
  const hasNoBom = !isLoading && productId && !bom;

  const moQty = Number(qty) || 1;
  const totalDuration = bom ? bom.operations.reduce((acc: number, op: any) => acc + op.durationMins, 0) : 0;

  const componentsData = bom ? bom.lines.map((line: any) => {
    const required = line.qty * moQty;
    const inventoryProduct = productsQuery.data?.find((p: any) => p.id === line.productId);
    const available = inventoryProduct ? inventoryProduct.freeToUse : 0;
    const isSufficient = available >= required;
    const isLowStock = available > 0 && !isSufficient;
    
    return {
      ...line,
      required,
      available,
      isSufficient,
      isLowStock,
      isShortage: available === 0 && required > 0
    };
  }) : [];

  const shortages = componentsData.filter((c: any) => !c.isSufficient);
  const hasShortages = shortages.length > 0;
  const canCreate = hasCreatePerm && productId && moQty > 0 && bom && !isLoading;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="bg-card border-border sm:max-w-[1000px] p-0 flex flex-col h-[85vh] sm:h-[800px] overflow-hidden gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border/70 shrink-0">
          <DialogTitle className="text-xl flex items-center gap-2"><Factory className="size-5" /> Create Manufacturing Order</DialogTitle>
          <DialogDescription>
            Create a draft MO from the product BoM, including components and work orders.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-6 pt-4 shrink-0 flex items-center justify-between border-b border-border/50">
              <TabsList className="bg-muted/40 grid w-[320px] grid-cols-2 mb-[-1px]">
                <TabsTrigger value="work-orders" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Work Orders</TabsTrigger>
                <TabsTrigger value="components" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Components</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Form Sidebar */}
              <div className="w-[300px] border-r border-border/50 p-6 space-y-5 bg-muted/10 shrink-0 overflow-y-auto">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Basic Information</Label>
                  <div className="space-y-4 mt-2">
                    <div className="space-y-1.5">
                      <Label>Manufactured Product</Label>
                      <Select value={productId || undefined} onValueChange={setProductId}>
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
                    <div className="space-y-1.5">
                      <Label htmlFor="moQty">Quantity</Label>
                      <Input id="moQty" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="bg-background/40" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="moDate">Scheduled Date</Label>
                      <Input id="moDate" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="bg-background/40" />
                    </div>
                  </div>
                </div>

                {bom && (
                  <div className="pt-4 border-t border-border/50 space-y-3">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Production Summary</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-background p-3 rounded-lg border border-border/50 flex flex-col items-center justify-center text-center">
                        <Clock className="size-4 text-muted-foreground mb-1" />
                        <span className="text-xs font-medium">{totalDuration} mins</span>
                        <span className="text-[10px] text-muted-foreground">Estimated Time</span>
                      </div>
                      <div className="bg-background p-3 rounded-lg border border-border/50 flex flex-col items-center justify-center text-center">
                        <Box className="size-4 text-muted-foreground mb-1" />
                        <span className="text-xs font-medium">{bom.lines.length}</span>
                        <span className="text-[10px] text-muted-foreground">Components</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Main Content Area */}
              <ScrollArea className="flex-1 bg-background/20 relative">
                <div className="p-6">
                  {!productId ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                      <Factory className="size-12 mb-4 opacity-20" />
                      <p className="text-sm">Select a product to view its manufacturing workflow.</p>
                    </div>
                  ) : isLoading ? (
                    <div className="space-y-4">
                      <div className="h-6 w-1/3 bg-muted/60 rounded animate-pulse" />
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-20 w-full bg-muted/40 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : hasNoBom ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-center max-w-sm mx-auto">
                      <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-4 border border-border">
                        <AlertTriangle className="size-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold tracking-tight">No active Bill of Materials found</h3>
                      <p className="text-sm text-muted-foreground mt-2 mb-6">This product requires an active BoM before a Manufacturing Order can be generated.</p>
                      <Link to="/bom">
                        <Button variant="outline" className="gap-2" onClick={handleClose}>
                          Go to Bill of Materials <ArrowRight className="size-4" />
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <>
                      <TabsContent value="work-orders" className="m-0 space-y-6">
                        <div>
                          <h3 className="text-sm font-semibold mb-1">Generated Work Orders</h3>
                          <p className="text-xs text-muted-foreground mb-6">The step-by-step production workflow required to manufacture this product.</p>
                          <div className="relative pl-4 space-y-6 before:absolute before:inset-y-0 before:left-[21px] before:w-[2px] before:bg-border/60">
                            {bom?.operations.map((op: any, index: number) => (
                              <div key={op.id} className="relative flex gap-4">
                                <div className="absolute -left-4 top-1 size-5 rounded-full bg-card border-2 border-primary flex items-center justify-center z-10">
                                  <span className="text-[9px] font-bold text-primary">{index + 1}</span>
                                </div>
                                <div className="flex-1 ml-4 bg-card rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-colors">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-semibold text-sm">{op.name}</h4>
                                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">{op.workCenter}</Badge>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-medium tabular-nums">{op.durationMins} min</div>
                                      <div className="text-[10px] text-muted-foreground">Estimated</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="components" className="m-0 space-y-6">
                        <div>
                          <h3 className="text-sm font-semibold mb-1">Components Required</h3>
                          <p className="text-xs text-muted-foreground mb-4">Verify material availability before starting production.</p>
                          
                          {hasShortages && (
                            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 flex gap-3 mb-6 items-start">
                              <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
                              <div>
                                <h4 className="text-sm font-medium text-warning">Insufficient materials detected</h4>
                                <p className="text-xs text-warning/80 mt-1">
                                  Production can still proceed using manager override, but components must be procured before they can be consumed.
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="grid gap-3">
                            {componentsData.map((c: any) => {
                              const progress = Math.min((c.available / c.required) * 100, 100) || 0;
                              return (
                                <div key={c.id} className="bg-card rounded-xl p-4 border border-border/50">
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <div className="font-medium text-sm flex items-center gap-2">
                                        {c.name}
                                        {!c.isSufficient && <Badge variant="outline" className="text-[9px] border-destructive/30 text-destructive h-4 px-1.5">Shortage</Badge>}
                                      </div>
                                      <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{c.sku}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-medium tabular-nums">{c.available} / {c.required}</div>
                                      <div className="text-[10px] text-muted-foreground">Available / Required</div>
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    <Progress 
                                      value={progress} 
                                      className="h-2" 
                                      indicatorColor={c.isSufficient ? "bg-success" : c.isLowStock ? "bg-warning" : "bg-destructive"}
                                    />
                                    <div className="flex justify-between text-[10px]">
                                      <span className={c.isSufficient ? "text-success" : "text-destructive"}>
                                        {c.isSufficient ? "Sufficient stock" : `${c.required - c.available} units short`}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </TabsContent>
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/70 shrink-0 bg-muted/5 flex items-center justify-between sm:justify-between">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <div className="flex gap-2">
            {hasShortages && canCreate && (
              <Button 
                variant="secondary" 
                className="bg-warning/20 text-warning hover:bg-warning/30 border-warning/30"
                disabled={createMutation.isPending}
                onClick={() => {
                  if (confirm("There are component shortages. Are you sure you want to create this MO with an override?")) {
                    createMutation.mutate();
                  }
                }}
              >
                Create with Override
              </Button>
            )}
            <Button 
              disabled={!canCreate || createMutation.isPending || (hasShortages && !hasCreatePerm)} 
              onClick={() => createMutation.mutate()}
            >
              Create Manufacturing Order
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
