import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Factory, Clock, CheckCircle2, Circle, ListTree, Calendar, GitBranch } from "lucide-react";
import { useState } from "react";
import { manufacturingOrders, type ManufacturingOrder } from "@/lib/mock-data";

export const Route = createFileRoute("/manufacturing")({
  head: () => ({ meta: [{ title: "Manufacturing · FlowERP" }] }),
  component: ManufacturingPage,
});

const columns: { key: ManufacturingOrder["status"]; label: string; icon: any; tone: string }[] = [
  { key: "Draft", label: "Draft", icon: Circle, tone: "text-muted-foreground" },
  { key: "In Progress", label: "In Progress", icon: Clock, tone: "text-warning" },
  { key: "Completed", label: "Completed", icon: CheckCircle2, tone: "text-success" },
];

function ManufacturingPage() {
  const [selected, setSelected] = useState<ManufacturingOrder | null>(null);

  return (
    <>
      <TopBar title="Manufacturing" breadcrumb="Work Orders" />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Manufacturing Board</h2>
            <p className="text-sm text-muted-foreground">{manufacturingOrders.length} work orders across 3 stages</p>
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5"><Plus className="size-3.5" /> New MO</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {columns.map((c) => {
            const cards = manufacturingOrders.filter((m) => m.status === c.key);
            return (
              <div key={c.key} className="rounded-lg border border-border/70 bg-card/40">
                <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <c.icon className={`size-3.5 ${c.tone}`} />
                    <span className="text-xs font-semibold">{c.label}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{cards.length}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="size-6 p-0"><Plus className="size-3.5" /></Button>
                </div>
                <div className="p-2 space-y-2 min-h-[400px]">
                  {cards.map((m) => (
                    <Card key={m.id} onClick={() => setSelected(m)} className="p-3 border-border/70 hover:border-primary/40 cursor-pointer transition bg-card">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-muted-foreground">{m.id}</span>
                        {m.linkedSO && <Badge variant="outline" className="text-[9px] border-border/70 px-1.5 py-0">{m.linkedSO}</Badge>}
                      </div>
                      <div className="mt-2 text-sm font-medium leading-tight">{m.product}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Qty <span className="text-foreground tabular-nums">{m.qty}</span> · Due {m.due.slice(5)}</div>
                      {m.status === "In Progress" && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Progress</span><span className="tabular-nums text-foreground">{m.progress}%</span>
                          </div>
                          <Progress value={m.progress} className="h-1.5" />
                        </div>
                      )}
                      {m.status === "Completed" && (
                        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-success"><CheckCircle2 className="size-3" /> Completed on time</div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-lg bg-card border-border overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">{selected.id} · {selected.sku}</div>
                <SheetTitle className="text-lg">{selected.product}</SheetTitle>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px]">{selected.status}</Badge>
                  <span className="text-xs text-muted-foreground">Qty <span className="text-foreground font-medium tabular-nums">{selected.qty}</span></span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="size-3" /> {selected.due}</span>
                </div>
              </SheetHeader>
              <div className="px-4 space-y-4">
                <div className="p-3 rounded-md border border-border/70 bg-background/40">
                  <div className="text-xs font-semibold flex items-center gap-2 mb-2"><ListTree className="size-3.5" /> Bill of Materials</div>
                  <div className="space-y-2">
                    {[
                      { name: "Wooden Top — Oak", qty: 1, ok: true },
                      { name: "Wooden Leg — Oak", qty: 4, ok: true },
                      { name: "Steel Screw M8", qty: 24, ok: true },
                    ].map((b, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span>{b.name}</span>
                        <span className="text-muted-foreground tabular-nums">× {b.qty * selected.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-md border border-border/70 bg-background/40">
                  <div className="text-xs font-semibold flex items-center gap-2 mb-2"><GitBranch className="size-3.5" /> Work Orders</div>
                  <div className="space-y-2">
                    {["Cutting", "Assembly", "Finishing", "QC"].map((w, i) => (
                      <div key={w} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {i < 2 ? <CheckCircle2 className="size-3.5 text-success" /> : i === 2 ? <Clock className="size-3.5 text-warning" /> : <Circle className="size-3.5 text-muted-foreground" />}
                          <span>{w}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{i < 2 ? "Done" : i === 2 ? "Running" : "Pending"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-md border border-border/70 bg-background/40">
                  <div className="text-xs font-semibold mb-3">Progress Timeline</div>
                  <div className="relative pl-4">
                    <div className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />
                    {[
                      { t: "Order created", time: "Jun 8" },
                      { t: "Materials reserved", time: "Jun 9" },
                      { t: "Cutting started", time: "Jun 10" },
                      { t: "Assembly in progress", time: "Today" },
                    ].map((e, i) => (
                      <div key={i} className="relative pb-3 last:pb-0">
                        <div className={`absolute -left-[12px] top-1 size-2.5 rounded-full ${i < 3 ? "bg-success" : "bg-primary"} border-2 border-card`} />
                        <div className="text-xs">{e.t}</div>
                        <div className="text-[10px] text-muted-foreground">{e.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
