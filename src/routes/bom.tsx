import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ListTree, Package, Plus, Trash2, Pencil } from "lucide-react";

import { TopBar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createBom, deactivateBom, listBoms, listWorkCenters, type BomListItem } from "@/lib/api/bom.functions";
import { getCurrentUserProfile } from "@/lib/api/auth.functions";
import { listProducts } from "@/lib/api/products.functions";

export const Route = createFileRoute("/bom")({
  head: () => ({ meta: [{ title: "Bill of Materials - FlowERP" }] }),
  component: BoMPage,
});

function makeLine() {
  return { key: Math.random().toString(36).slice(2), componentProductId: "", qty: "1" };
}

function makeOperation(sequence: number) {
  return { key: Math.random().toString(36).slice(2), name: "", workCenterId: "", durationMins: "30", sequence: String(sequence) };
}

function BoMPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [lines, setLines] = useState([makeLine()]);
  const [operations, setOperations] = useState([makeOperation(1)]);
  const listBomsFn = useServerFn(listBoms);
  const listProductsFn = useServerFn(listProducts);
  const listWorkCentersFn = useServerFn(listWorkCenters);
  const createBomFn = useServerFn(createBom);
  const deactivateBomFn = useServerFn(deactivateBom);

  const bomsQuery = useQuery({ queryKey: ["boms"], queryFn: () => listBomsFn() });

  const getCurrentUserProfileFn = useServerFn(getCurrentUserProfile);
  const profileQuery = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: () => getCurrentUserProfileFn(),
  });
  const permissions = profileQuery.data?.permissions || [];
  const can = (p: string) => permissions.includes("*") || permissions.includes(p);
  const canWrite = can("bom:write");

  const productsQuery = useQuery({
    queryKey: ["bom-product-picker"],
    queryFn: () => listProductsFn({ data: { category: "All", search: "" } }),
  });
  const workCentersQuery = useQuery({ queryKey: ["work-centers"], queryFn: () => listWorkCentersFn() });

  const createMutation = useMutation({
    mutationFn: () => createBomFn({
      data: {
        productId,
        qty: Number(qty),
        lines: lines
          .filter((line) => line.componentProductId && Number(line.qty) > 0)
          .map((line) => ({ componentProductId: line.componentProductId, qty: Number(line.qty) })),
        operations: operations
          .filter((operation) => operation.name.trim() && operation.workCenterId && Number(operation.durationMins) > 0)
          .map((operation) => ({
            name: operation.name.trim(),
            workCenterId: operation.workCenterId,
            durationMins: Number(operation.durationMins),
            sequence: Number(operation.sequence),
          })),
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boms"] });
      queryClient.invalidateQueries({ queryKey: ["manufacturing-orders"] });
      toast.success("Bill of Materials saved.");
      setCreateOpen(false);
      setProductId("");
      setQty("1");
      setLines([makeLine()]);
      setOperations([makeOperation(1)]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save BoM.");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateBomFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boms"] });
      toast.success("BoM deactivated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not deactivate BoM.");
    },
  });

  function openEdit(bom: BomListItem) {
    setProductId(bom.productId);
    setQty(String(bom.qty));
    setLines(bom.lines.map(line => ({
      key: Math.random().toString(36).slice(2),
      componentProductId: line.productId,
      qty: String(line.qty),
    })));
    setOperations(bom.operations.map(op => ({
      key: Math.random().toString(36).slice(2),
      name: op.name,
      workCenterId: op.workCenterId,
      durationMins: String(op.durationMins),
      sequence: String(op.sequence),
    })));
    setCreateOpen(true);
  }

  function openCreate() {
    setProductId("");
    setQty("1");
    setLines([makeLine()]);
    setOperations([makeOperation(1)]);
    setCreateOpen(true);
  }

  const products = productsQuery.data ?? [];
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const manufacturedProducts = products.filter((product) => product.procurement === "Manufacture");
  const workCenters = workCentersQuery.data ?? [];
  const boms = bomsQuery.data ?? [];
  const canSave = productId && Number(qty) > 0 && lines.some((line) => line.componentProductId && Number(line.qty) > 0) && operations.some((operation) => operation.name.trim() && operation.workCenterId && Number(operation.durationMins) > 0);

  return (
    <>
      <TopBar title="Bill of Materials" breadcrumb="Manufacturing" />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Bill of Materials</h2>
            <p className="text-sm text-muted-foreground">Component recipes and operation routing for manufactured products</p>
          </div>
          {canWrite && (
            <Button size="sm" onClick={openCreate} className="h-8 text-xs gap-1.5">
              <Plus className="size-3.5" /> New BoM
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {bomsQuery.isLoading && Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="p-5 border-border/70">
              <div className="h-40 rounded bg-muted/60 animate-pulse" />
            </Card>
          ))}
          {!bomsQuery.isLoading && bomsQuery.isError && (
            <Card className="p-5 border-destructive/30 bg-destructive/10 text-sm text-destructive">
              BoMs could not be loaded.
            </Card>
          )}
          {!bomsQuery.isLoading && !bomsQuery.isError && boms.length === 0 && (
            <Card className="p-8 border-border/70 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
              No BoMs yet. Create one for a manufactured product.
            </Card>
          )}
          {!bomsQuery.isLoading && !bomsQuery.isError && boms.map((bom) => (
            <Card key={bom.id} className="p-5 border-border/70">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{bom.sku}</div>
                  <div className="text-sm font-semibold mt-1">{bom.productName}</div>
                </div>
                {canWrite && (
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="size-6 text-muted-foreground hover:text-foreground" onClick={() => openEdit(bom)}>
                      <Pencil className="size-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="size-6 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="size-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deactivate BoM for {bom.sku}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will hide the BoM and prevent new manufacturing orders from using it. Existing orders are unaffected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={deactivateMutation.isPending}
                            onClick={() => deactivateMutation.mutate(bom.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Deactivate
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {bom.lines.map((line) => (
                  <div key={line.id} className="flex items-center justify-between p-2.5 rounded-md border border-border/60 bg-background/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs truncate">{line.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-border/70 tabular-nums">x {line.qty}</Badge>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-border/70 pt-3 space-y-1.5">
                {bom.operations.map((operation) => (
                  <div key={operation.id} className="flex items-center justify-between text-[11px]">
                    <span>{operation.sequence}. {operation.name}</span>
                    <span className="text-muted-foreground">{operation.workCenter} / {operation.durationMins}m</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{productId && boms.some(b => b.productId === productId) ? "Edit Bill of Materials" : "Create Bill of Materials"}</DialogTitle>
            <DialogDescription>
              Define the components and operation route for a manufactured product.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <div className="space-y-2">
                <Label>Finished Product</Label>
                <Select value={productId || undefined} onValueChange={setProductId}>
                  <SelectTrigger className="bg-background/40">
                    <SelectValue placeholder={productsQuery.isLoading ? "Loading products..." : "Select manufactured product"} />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturedProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>{product.sku} / {product.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bomQty">Output Qty</Label>
                <Input id="bomQty" type="number" min="1" value={qty} onChange={(event) => setQty(event.target.value)} className="bg-background/40" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Components</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setLines((items) => [...items, makeLine()])} className="h-7 text-[11px]">
                  <Plus className="mr-1 size-3" /> Add component
                </Button>
              </div>
              {lines.map((line, index) => {
                const component = productsById.get(line.componentProductId);
                return (
                  <div key={line.key} className="grid grid-cols-[1fr_100px_34px] gap-2 rounded-md border border-border/70 bg-background/40 p-2">
                    <Select value={line.componentProductId || undefined} onValueChange={(value) => setLines((items) => items.map((item) => item.key === line.key ? { ...item, componentProductId: value } : item))}>
                      <SelectTrigger className="h-9 bg-card">
                        <SelectValue placeholder="Select component" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>{product.sku} / {product.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input value={line.qty} onChange={(event) => setLines((items) => items.map((item) => item.key === line.key ? { ...item, qty: event.target.value } : item))} type="number" min="0.001" step="0.001" className="h-9 bg-card text-right" />
                    <Button type="button" variant="ghost" size="sm" disabled={lines.length === 1} onClick={() => setLines((items) => items.filter((item) => item.key !== line.key))} className="size-9 p-0" aria-label={`Remove component ${index + 1}`}>
                      <Trash2 className="size-4" />
                    </Button>
                    {component && <div className="col-span-3 px-1 text-[11px] text-muted-foreground">{component.category} / Free {component.freeToUse}</div>}
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Operations</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setOperations((items) => [...items, makeOperation(items.length + 1)])} className="h-7 text-[11px]">
                  <Plus className="mr-1 size-3" /> Add operation
                </Button>
              </div>
              {operations.map((operation, index) => (
                <div key={operation.key} className="grid grid-cols-[52px_1fr_150px_100px_34px] gap-2 rounded-md border border-border/70 bg-background/40 p-2">
                  <Input value={operation.sequence} onChange={(event) => setOperations((items) => items.map((item) => item.key === operation.key ? { ...item, sequence: event.target.value } : item))} type="number" min="1" className="h-9 bg-card text-right" />
                  <Input value={operation.name} onChange={(event) => setOperations((items) => items.map((item) => item.key === operation.key ? { ...item, name: event.target.value } : item))} placeholder="Assembly" className="h-9 bg-card" />
                  <Select value={operation.workCenterId || undefined} onValueChange={(value) => setOperations((items) => items.map((item) => item.key === operation.key ? { ...item, workCenterId: value } : item))}>
                    <SelectTrigger className="h-9 bg-card">
                      <SelectValue placeholder="Work center" />
                    </SelectTrigger>
                    <SelectContent>
                      {workCenters.map((workCenter) => (
                        <SelectItem key={workCenter.id} value={workCenter.id}>{workCenter.code} / {workCenter.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={operation.durationMins} onChange={(event) => setOperations((items) => items.map((item) => item.key === operation.key ? { ...item, durationMins: event.target.value } : item))} type="number" min="1" className="h-9 bg-card text-right" />
                  <Button type="button" variant="ghost" size="sm" disabled={operations.length === 1} onClick={() => setOperations((items) => items.filter((item) => item.key !== operation.key))} className="size-9 p-0" aria-label={`Remove operation ${index + 1}`}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!canSave || createMutation.isPending} onClick={() => createMutation.mutate()}>
              Save BoM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
