import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Search, Filter, Plus, Package, Boxes, Wallet, Tag, Pencil, Trash2 } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { getCurrentUserProfile } from "@/lib/api/auth.functions";
import { createProduct, deactivateProduct, listProductCategories, listProducts, updateProduct, type ProductListItem } from "@/lib/api/products.functions";
import { listVendors } from "@/lib/api/vendors.functions";
import { formatINR } from "@/lib/formatters";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products - FlowERP" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ProductListItem | null>(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    sku: "",
    name: "",
    category: "Furniture",
    salesPrice: "0",
    costPrice: "0",
    onHandQty: "0",
    reorderPoint: "10",
    uom: "pcs",
    procureOnDemand: true,
    procurementType: "MANUFACTURE",
    vendorId: "",
  });
  const listProductCategoriesFn = useServerFn(listProductCategories);
  const listProductsFn = useServerFn(listProducts);
  const listVendorsFn = useServerFn(listVendors);
  const createProductFn = useServerFn(createProduct);
  const updateProductFn = useServerFn(updateProduct);
  const deactivateProductFn = useServerFn(deactivateProduct);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "", name: "", category: "", salesPrice: "0", costPrice: "0",
    reorderPoint: "10", uom: "pcs", procureOnDemand: true,
    procurementType: "MANUFACTURE", vendorId: "",
  });

  const categoriesQuery = useQuery({
    queryKey: ["product-categories"],
    queryFn: () => listProductCategoriesFn(),
  });

  const getCurrentUserProfileFn = useServerFn(getCurrentUserProfile);
  const profileQuery = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: () => getCurrentUserProfileFn(),
  });
  const permissions = profileQuery.data?.permissions || [];
  const canWrite = permissions.includes("*") || permissions.includes("products:write");

  const productsQuery = useQuery({
    queryKey: ["products", filter, search],
    queryFn: () => listProductsFn({ data: { category: filter, search } }),
  });

  const vendorsQuery = useQuery({
    queryKey: ["vendors"],
    queryFn: () => listVendorsFn(),
  });

  const createMutation = useMutation({
    mutationFn: () => createProductFn({
      data: {
        sku: productForm.sku,
        name: productForm.name,
        category: productForm.category,
        salesPrice: Number(productForm.salesPrice),
        costPrice: Number(productForm.costPrice),
        onHandQty: Number(productForm.onHandQty),
        reorderPoint: Number(productForm.reorderPoint),
        uom: productForm.uom,
        procureOnDemand: productForm.procureOnDemand,
        procurementType: productForm.procurementType as "BUY" | "MANUFACTURE",
        vendorId: productForm.procurementType === "BUY" ? productForm.vendorId : null,
      },
    }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success(`${result.data.sku} created.`);
      setSelected(result.data);
      setCreateOpen(false);
      setProductForm({
        sku: "",
        name: "",
        category: "Furniture",
        salesPrice: "0",
        costPrice: "0",
        onHandQty: "0",
        reorderPoint: "10",
        uom: "pcs",
        procureOnDemand: true,
        procurementType: "MANUFACTURE",
        vendorId: "",
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create product.");
    },
  });

  const cats = categoriesQuery.data ?? ["All"];
  const list = productsQuery.data ?? [];
  const isLoading = productsQuery.isLoading || categoriesQuery.isLoading;
  const canCreate = productForm.sku.trim() && productForm.name.trim() && Number(productForm.salesPrice) > 0 && Number(productForm.costPrice) > 0 && (productForm.procurementType !== "BUY" || productForm.vendorId);

  const updateMutation = useMutation({
    mutationFn: () => updateProductFn({
      data: {
        id: editForm.id,
        name: editForm.name,
        category: editForm.category,
        salesPrice: Number(editForm.salesPrice),
        costPrice: Number(editForm.costPrice),
        reorderPoint: Number(editForm.reorderPoint),
        uom: editForm.uom,
        procureOnDemand: editForm.procureOnDemand,
        procurementType: editForm.procurementType as "BUY" | "MANUFACTURE",
        vendorId: editForm.procurementType === "BUY" ? editForm.vendorId : null,
      },
    }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
      toast.success(`${result.data.sku} updated.`);
      setSelected(result.data);
      setEditOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update product.");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateProductFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success("Product deactivated.");
      setSelected(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not deactivate product.");
    },
  });

  function openEdit(product: ProductListItem) {
    setEditForm({
      id: product.id,
      name: product.name,
      category: product.category,
      salesPrice: String(product.salesPrice),
      costPrice: String(product.costPrice),
      reorderPoint: String(product.reorderPoint),
      uom: product.unit,
      procureOnDemand: product.procurement === "Manufacture" ? true : true,
      procurementType: product.procurement === "Buy" ? "BUY" : "MANUFACTURE",
      vendorId: "",
    });
    setEditOpen(true);
  }

  const canEdit = editForm.name.trim() && Number(editForm.salesPrice) > 0 && Number(editForm.costPrice) > 0 && (editForm.procurementType !== "BUY" || editForm.vendorId);

  return (
    <>
      <TopBar title="Products" breadcrumb="Catalog" />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Product Catalog</h2>
            <p className="text-sm text-muted-foreground">{list.length} SKUs / {Math.max(cats.length - 1, 0)} categories</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search SKU, name..."
                className="h-8 pl-8 text-xs w-64 bg-card border-border/70"
              />
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"><Filter className="size-3.5" /> Filters</Button>
            {canWrite && (
              <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 text-xs gap-1.5"><Plus className="size-3.5" /> New Product</Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {cats.map((category) => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`px-2.5 py-1 rounded-md text-xs border transition ${filter === category ? "bg-accent border-border text-foreground" : "border-border/70 text-muted-foreground hover:text-foreground hover:border-border"}`}
            >
              {category}
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
              {isLoading && (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-t border-border/60">
                    <td className="px-4 py-3" colSpan={9}>
                      <div className="h-4 rounded bg-muted/60 animate-pulse" />
                    </td>
                  </tr>
                ))
              )}
              {!isLoading && productsQuery.isError && (
                <tr className="border-t border-border/60">
                  <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={9}>
                    Products could not be loaded. Check the database connection and try again.
                  </td>
                </tr>
              )}
              {!isLoading && !productsQuery.isError && list.length === 0 && (
                <tr className="border-t border-border/60">
                  <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={9}>
                    No products found.
                  </td>
                </tr>
              )}
              {!isLoading && !productsQuery.isError && list.map((product) => {
                const low = product.freeToUse <= product.reorderPoint;

                return (
                  <tr key={product.id} onClick={() => setSelected(product)} className="border-t border-border/60 hover:bg-accent/40 cursor-pointer transition">
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{product.sku}</td>
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{product.category}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] border-border/70">{product.procurement}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatINR(product.salesPrice)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{product.onHand}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{product.reserved}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{product.freeToUse}</td>
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

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-md bg-card border-border">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">{selected.category} / {selected.procurement}</div>
                <SheetTitle className="text-lg">{selected.name}</SheetTitle>
                <div className="text-xs font-mono text-muted-foreground">{selected.sku}</div>
              </SheetHeader>
              <div className="px-4 space-y-4">
                {canWrite && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(selected)} className="h-8 text-xs gap-1.5">
                      <Pencil className="size-3.5" /> Edit Product
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10">
                          <Trash2 className="size-3.5" /> Deactivate
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deactivate {selected.sku}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will hide the product from all lists and prevent it from being used in new orders.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Active</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={deactivateMutation.isPending}
                            onClick={() => deactivateMutation.mutate(selected.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Deactivate
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
                <div className="aspect-video rounded-lg border border-border/70 bg-gradient-to-br from-muted/40 to-background flex items-center justify-center">
                  <Package className="size-12 text-muted-foreground/50" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "On-Hand", value: selected.onHand, icon: Boxes, tone: "text-foreground" },
                    { label: "Reserved", value: selected.reserved, icon: Tag, tone: "text-muted-foreground" },
                    { label: "Free-to-Use", value: selected.freeToUse, icon: Wallet, tone: "text-success" },
                  ].map((stat) => (
                    <div key={stat.label} className="p-3 rounded-md border border-border/70 bg-background/40">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</div>
                      <div className={`text-lg font-semibold tabular-nums mt-1 ${stat.tone}`}>{stat.value}</div>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-md border border-border/70 bg-background/40 space-y-2">
                  <div className="text-xs font-semibold">Pricing</div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">List price</span><span className="tabular-nums font-medium">{formatINR(selected.salesPrice)}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Cost price</span><span className="tabular-nums font-medium">{formatINR(selected.costPrice)}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Unit</span><span>{selected.unit}</span></div>
                </div>
                <div className="p-4 rounded-md border border-border/70 bg-background/40 space-y-2">
                  <div className="text-xs font-semibold">Procurement Configuration</div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Strategy</span><Badge variant="outline" className="text-[10px]">{selected.procurement}</Badge></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Reorder point</span><span className="tabular-nums">{selected.reorderPoint}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Vendor</span><span>{selected.vendorName ?? "Internal"}</span></div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Product</DialogTitle>
            <DialogDescription>
              Configure stock, pricing, and procurement behavior for the ERP workflow.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={productForm.sku} onChange={(event) => setProductForm((form) => ({ ...form, sku: event.target.value }))} placeholder="FRN-TBL-OAK" className="bg-background/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productName">Name</Label>
              <Input id="productName" value={productForm.name} onChange={(event) => setProductForm((form) => ({ ...form, name: event.target.value }))} placeholder="Wooden Dining Table" className="bg-background/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={productForm.category} onChange={(event) => setProductForm((form) => ({ ...form, category: event.target.value }))} className="bg-background/40" />
            </div>
            <div className="space-y-2">
              <Label>Procurement Type</Label>
              <Select value={productForm.procurementType} onValueChange={(value) => setProductForm((form) => ({ ...form, procurementType: value, vendorId: value === "BUY" ? form.vendorId : "" }))}>
                <SelectTrigger className="bg-background/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUFACTURE">Manufacture</SelectItem>
                  <SelectItem value="BUY">Buy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {productForm.procurementType === "BUY" && (
              <div className="space-y-2 md:col-span-2">
                <Label>Vendor</Label>
                <Select value={productForm.vendorId || undefined} onValueChange={(value) => setProductForm((form) => ({ ...form, vendorId: value }))}>
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
            )}
            <div className="space-y-2">
              <Label htmlFor="salesPrice">Sales Price</Label>
              <Input id="salesPrice" type="number" min="0" value={productForm.salesPrice} onChange={(event) => setProductForm((form) => ({ ...form, salesPrice: event.target.value }))} className="bg-background/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice">Cost Price</Label>
              <Input id="costPrice" type="number" min="0" value={productForm.costPrice} onChange={(event) => setProductForm((form) => ({ ...form, costPrice: event.target.value }))} className="bg-background/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onHandQty">Opening Stock</Label>
              <Input id="onHandQty" type="number" min="0" value={productForm.onHandQty} onChange={(event) => setProductForm((form) => ({ ...form, onHandQty: event.target.value }))} className="bg-background/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderPoint">Reorder Point</Label>
              <Input id="reorderPoint" type="number" min="0" value={productForm.reorderPoint} onChange={(event) => setProductForm((form) => ({ ...form, reorderPoint: event.target.value }))} className="bg-background/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uom">Unit</Label>
              <Input id="uom" value={productForm.uom} onChange={(event) => setProductForm((form) => ({ ...form, uom: event.target.value }))} className="bg-background/40" />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/70 bg-background/40 px-3 py-2">
              <div>
                <Label htmlFor="procureOnDemand">Procure on demand</Label>
                <div className="text-[11px] text-muted-foreground">Trigger PO/MO when Sales confirms shortages.</div>
              </div>
              <Switch id="procureOnDemand" checked={productForm.procureOnDemand} onCheckedChange={(checked) => setProductForm((form) => ({ ...form, procureOnDemand: checked }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!canCreate || createMutation.isPending} onClick={() => createMutation.mutate()}>
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product configuration. SKU cannot be changed after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input id="editName" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="bg-background/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCategory">Category</Label>
              <Input id="editCategory" value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} className="bg-background/40" />
            </div>
            <div className="space-y-2">
              <Label>Procurement Type</Label>
              <Select value={editForm.procurementType} onValueChange={(v) => setEditForm((f) => ({ ...f, procurementType: v, vendorId: v === "BUY" ? f.vendorId : "" }))}>
                <SelectTrigger className="bg-background/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUFACTURE">Manufacture</SelectItem>
                  <SelectItem value="BUY">Buy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editForm.procurementType === "BUY" && (
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Select value={editForm.vendorId || undefined} onValueChange={(v) => setEditForm((f) => ({ ...f, vendorId: v }))}>
                  <SelectTrigger className="bg-background/40"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {(vendorsQuery.data ?? []).map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="editSalesPrice">Sales Price</Label>
              <Input id="editSalesPrice" type="number" min="0" value={editForm.salesPrice} onChange={(e) => setEditForm((f) => ({ ...f, salesPrice: e.target.value }))} className="bg-background/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCostPrice">Cost Price</Label>
              <Input id="editCostPrice" type="number" min="0" value={editForm.costPrice} onChange={(e) => setEditForm((f) => ({ ...f, costPrice: e.target.value }))} className="bg-background/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editReorderPoint">Reorder Point</Label>
              <Input id="editReorderPoint" type="number" min="0" value={editForm.reorderPoint} onChange={(e) => setEditForm((f) => ({ ...f, reorderPoint: e.target.value }))} className="bg-background/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editUom">Unit</Label>
              <Input id="editUom" value={editForm.uom} onChange={(e) => setEditForm((f) => ({ ...f, uom: e.target.value }))} className="bg-background/40" />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/70 bg-background/40 px-3 py-2 md:col-span-2">
              <div>
                <Label htmlFor="editProcureOnDemand">Procure on demand</Label>
                <div className="text-[11px] text-muted-foreground">Trigger PO/MO when Sales confirms shortages.</div>
              </div>
              <Switch id="editProcureOnDemand" checked={editForm.procureOnDemand} onCheckedChange={(checked) => setEditForm((f) => ({ ...f, procureOnDemand: checked }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button disabled={!canEdit || updateMutation.isPending} onClick={() => updateMutation.mutate()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
