import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Star, Truck } from "lucide-react";

import { TopBar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUserProfile } from "@/lib/api/auth.functions";
import { createVendor, listVendors } from "@/lib/api/vendors.functions";
import { formatINR } from "@/lib/formatters";

export const Route = createFileRoute("/vendors")({
  head: () => ({ meta: [{ title: "Vendors - FlowERP" }] }),
  component: VendorsPage,
});

function VendorsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", leadTime: "3" });
  const listVendorsFn = useServerFn(listVendors);
  const createVendorFn = useServerFn(createVendor);

  const vendorsQuery = useQuery({
    queryKey: ["vendors"],
    queryFn: () => listVendorsFn(),
  });

  const getCurrentUserProfileFn = useServerFn(getCurrentUserProfile);
  const profileQuery = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: () => getCurrentUserProfileFn(),
  });
  const permissions = profileQuery.data?.permissions || [];
  const canWrite = permissions.includes("*") || permissions.includes("vendors:write");

  const createMutation = useMutation({
    mutationFn: () => createVendorFn({
      data: {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        leadTime: Number(form.leadTime),
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor created.");
      setCreateOpen(false);
      setForm({ name: "", email: "", phone: "", address: "", leadTime: "3" });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create vendor.");
    },
  });

  const vendors = vendorsQuery.data ?? [];
  const canCreate = form.name.trim().length > 0;

  return (
    <>
      <TopBar title="Vendors" breadcrumb="Supply Chain" />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Vendors</h2>
            <p className="text-sm text-muted-foreground">{vendors.length} approved suppliers</p>
          </div>
          {canWrite && (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 text-xs gap-1.5">
              <Plus className="size-3.5" /> New Vendor
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {vendorsQuery.isLoading && Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="p-5 border-border/70">
              <div className="h-32 rounded bg-muted/60 animate-pulse" />
            </Card>
          ))}
          {!vendorsQuery.isLoading && vendorsQuery.isError && (
            <Card className="p-5 border-destructive/30 bg-destructive/10 text-sm text-destructive">
              Vendors could not be loaded.
            </Card>
          )}
          {!vendorsQuery.isLoading && !vendorsQuery.isError && vendors.length === 0 && (
            <Card className="p-8 border-border/70 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-4">
              No vendors yet. Add a supplier to enable purchase procurement.
            </Card>
          )}
          {!vendorsQuery.isLoading && !vendorsQuery.isError && vendors.map((vendor) => (
            <Card key={vendor.id} className="p-5 border-border/70">
              <div className="flex items-start justify-between">
                <div className="size-9 rounded-md bg-primary/15 flex items-center justify-center"><Truck className="size-4 text-primary" /></div>
                <div className="flex items-center gap-0.5 text-xs"><Star className="size-3 text-warning fill-warning" /><span className="tabular-nums">{vendor.rating ?? "New"}</span></div>
              </div>
              <div className="mt-3 text-sm font-semibold">{vendor.name}</div>
              <Badge variant="outline" className="text-[10px] mt-1 border-border/70">{vendor.productCount} linked products</Badge>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Lead time</div><div className="font-medium mt-0.5">{vendor.leadTime ?? "-"} days</div></div>
                <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">PO spend</div><div className="font-medium mt-0.5 tabular-nums">{formatINR(vendor.spend)}</div></div>
              </div>
              <div className="mt-4 text-[11px] text-muted-foreground space-y-1">
                {vendor.email && <div className="truncate">{vendor.email}</div>}
                {vendor.phone && <div className="truncate">{vendor.phone}</div>}
              </div>
            </Card>
          ))}
        </div>
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create Vendor</DialogTitle>
            <DialogDescription>
              Add a supplier for purchased products and manual purchase orders.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendorName">Name</Label>
              <Input id="vendorName" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} className="bg-background/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="vendorEmail">Email</Label>
                <Input id="vendorEmail" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} className="bg-background/40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendorPhone">Phone</Label>
                <Input id="vendorPhone" value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} className="bg-background/40" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorAddress">Address</Label>
              <Input id="vendorAddress" value={form.address} onChange={(event) => setForm((value) => ({ ...value, address: event.target.value }))} className="bg-background/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorLead">Lead Time Days</Label>
              <Input id="vendorLead" type="number" min="0" value={form.leadTime} onChange={(event) => setForm((value) => ({ ...value, leadTime: event.target.value }))} className="bg-background/40" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!canCreate || createMutation.isPending} onClick={() => createMutation.mutate()}>
              Create Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
