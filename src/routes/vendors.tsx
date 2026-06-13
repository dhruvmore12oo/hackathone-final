import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Star } from "lucide-react";

export const Route = createFileRoute("/vendors")({
  head: () => ({ meta: [{ title: "Vendors · FlowERP" }] }),
  component: VendorsPage,
});

const vendors = [
  { name: "Oakwood Timber Co.", category: "Raw Material", rating: 4.8, leadTime: "5 days", spend: "₹18.4L" },
  { name: "TechBolt Industries", category: "Hardware", rating: 4.6, leadTime: "2 days", spend: "₹4.2L" },
  { name: "Hyderabad Leather Mills", category: "Raw Material", rating: 4.3, leadTime: "7 days", spend: "₹9.8L" },
  { name: "Mumbai Polish Works", category: "Finishing", rating: 4.5, leadTime: "3 days", spend: "₹3.1L" },
];

function VendorsPage() {
  return (
    <>
      <TopBar title="Vendors" breadcrumb="Supply Chain" />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Vendors</h2>
          <p className="text-sm text-muted-foreground">{vendors.length} approved suppliers</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {vendors.map((v) => (
            <Card key={v.name} className="p-5 border-border/70">
              <div className="flex items-start justify-between">
                <div className="size-9 rounded-md bg-primary/15 flex items-center justify-center"><Truck className="size-4 text-primary" /></div>
                <div className="flex items-center gap-0.5 text-xs"><Star className="size-3 text-warning fill-warning" /><span className="tabular-nums">{v.rating}</span></div>
              </div>
              <div className="mt-3 text-sm font-semibold">{v.name}</div>
              <Badge variant="outline" className="text-[10px] mt-1 border-border/70">{v.category}</Badge>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Lead time</div><div className="font-medium mt-0.5">{v.leadTime}</div></div>
                <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">YTD spend</div><div className="font-medium mt-0.5 tabular-nums">{v.spend}</div></div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
