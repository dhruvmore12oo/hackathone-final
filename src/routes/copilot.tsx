import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Send, TrendingDown, ShoppingBag, Activity, Boxes,
  ArrowRight, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/copilot")({
  head: () => ({ meta: [{ title: "FlowAI Copilot · FlowERP" }] }),
  component: Copilot,
});

const suggestions = [
  { icon: TrendingDown, q: "Which products are at risk of stockout?" },
  { icon: ShoppingBag, q: "What should I reorder today?" },
  { icon: Activity, q: "Show procurement bottlenecks this week." },
  { icon: Boxes, q: "Analyze inventory health by category." },
];

const stockoutData = [
  { p: "Park Bench", days: 2 },
  { p: "Coffee Table", days: 4 },
  { p: "Wooden Leg", days: 6 },
  { p: "Dining Table", days: 12 },
];

function Copilot() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <>
      <TopBar title="FlowAI Copilot" breadcrumb="Executive Assistant" />
      <main className="p-6 max-w-5xl w-full mx-auto space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-xl border border-border/70 p-8 bg-gradient-to-br from-primary/10 via-card to-card">
          <div className="absolute -top-20 -right-20 size-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 size-64 rounded-full bg-chart-5/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs text-primary font-medium uppercase tracking-wider">
              <Sparkles className="size-3.5" /> FlowAI · Powered by your operations data
            </div>
            <h2 className="text-3xl font-semibold tracking-tight mt-2">Hi Admin, what should we look at today?</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">Ask anything about your sales pipeline, inventory health, procurement, or production. FlowAI reasons over realtime data and returns executive-ready insights.</p>

            <div className="mt-6 flex items-center gap-2 rounded-lg border border-border bg-background/70 p-2">
              <Sparkles className="size-4 text-primary ml-2" />
              <input
                placeholder="Ask FlowAI… e.g. 'What's blocking SO-10421?'"
                className="flex-1 bg-transparent outline-none text-sm py-1.5"
              />
              <Button size="sm" className="h-8 gap-1.5 text-xs"><Send className="size-3.5" /> Ask</Button>
            </div>
          </div>
        </div>

        {/* Suggested prompts */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">Suggested prompts</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((s) => (
              <button key={s.q} onClick={() => setActive(s.q)}
                className={`text-left p-4 rounded-lg border transition group ${active === s.q ? "border-primary bg-primary/5" : "border-border/70 bg-card hover:border-border"}`}>
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-primary/15 transition">
                    <s.icon className="size-4 text-muted-foreground group-hover:text-primary transition" />
                  </div>
                  <span className="text-sm font-medium">{s.q}</span>
                  <ArrowRight className="size-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Insight card */}
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
            <Sparkles className="size-3 text-primary" /> Insight · Stockout risk analysis
          </div>
          <Card className="p-6 border-border/70 space-y-5">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-md bg-warning/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-4 text-warning" />
              </div>
              <div>
                <div className="text-sm font-semibold">3 products will stock out within 7 days</div>
                <p className="text-sm text-muted-foreground mt-1">Based on the trailing 30-day consumption velocity and reserved quantities, the following SKUs need attention. <span className="text-foreground">Park Bench — Teak</span> is the most urgent.</p>
              </div>
            </div>

            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockoutData} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 0 }} barCategoryGap={10}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#27272A" />
                  <XAxis type="number" stroke="#52525B" fontSize={10} tickLine={false} axisLine={false} unit="d" />
                  <YAxis dataKey="p" type="category" stroke="#A1A1AA" fontSize={11} tickLine={false} axisLine={false} width={92} />
                  <Tooltip contentStyle={{ background: "#18181B", border: "1px solid #27272A", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="days" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {[
                { t: "Reorder Park Bench Teak", d: "Create PO for 15 units · ~₹2.7L", tone: "destructive" as const },
                { t: "Expedite MO-3003", d: "Coffee Table — bring due date forward 2d", tone: "warning" as const },
                { t: "Increase safety stock", d: "Wooden Leg Oak: 200 → 280", tone: "muted" as const },
              ].map((r, i) => (
                <div key={i} className="p-3 rounded-md border border-border/70 bg-background/40">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`size-3.5 ${r.tone === "destructive" ? "text-destructive" : r.tone === "warning" ? "text-warning" : "text-muted-foreground"}`} />
                    <span className="text-xs font-medium">{r.t}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1.5">{r.d}</div>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] mt-2">Apply <ArrowRight className="size-3 ml-1" /></Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
