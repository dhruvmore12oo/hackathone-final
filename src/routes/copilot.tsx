import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Send, TrendingDown, ShoppingBag, Activity, Boxes,
  ArrowRight, Loader2, User,
} from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { askCopilot } from "@/lib/api/copilot.functions";

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

const stockoutData = [];

function Copilot() {
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  const askMutation = useMutation({
    mutationFn: (msg: string) => askCopilot({ data: { message: msg } }),
    onSuccess: (data) => {
      setHistory((h) => [...h, { role: "ai", text: data.answer }]);
    },
    onError: () => {
      setHistory((h) => [...h, { role: "ai", text: "I encountered an error while accessing the ERP data." }]);
    },
  });

  const handleSend = (q: string) => {
    if (!q.trim() || askMutation.isPending) return;
    setHistory((h) => [...h, { role: "user", text: q }]);
    setInput("");
    setActive(null);
    askMutation.mutate(q);
  };

  return (
    <>
      <TopBar title="FlowAI Copilot" breadcrumb="Executive Assistant" />
      <main className="p-6 max-w-5xl w-full mx-auto space-y-6 flex flex-col h-[calc(100vh-64px)] overflow-hidden pb-10">
        
        <div className="flex-1 overflow-y-auto space-y-6 pr-4">
          {history.length === 0 ? (
            <>
              {/* Hero */}
              <div className="relative overflow-hidden rounded-xl border border-border/70 p-8 bg-gradient-to-br from-primary/10 via-card to-card shrink-0">
                <div className="absolute -top-20 -right-20 size-64 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 size-64 rounded-full bg-chart-5/15 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 text-xs text-primary font-medium uppercase tracking-wider">
                    <Sparkles className="size-3.5" /> FlowAI · Powered by your operations data
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight mt-2">Hi Admin, what should we look at today?</h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xl">Ask anything about your sales pipeline, inventory health, procurement, or production. FlowAI reasons over realtime data and returns executive-ready insights.</p>
                </div>
              </div>

              {/* Suggested prompts */}
              <div className="shrink-0 pt-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">Suggested prompts</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suggestions.map((s) => (
                    <button key={s.q} onClick={() => { setActive(s.q); setInput(s.q); }}
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
            </>
          ) : (
            <div className="space-y-6 pb-10">
              {history.map((msg, idx) => (
                <div key={idx} className={`flex items-start gap-4 ${msg.role === "ai" ? "" : "flex-row-reverse"}`}>
                  <div className={`size-8 rounded-md shrink-0 flex items-center justify-center ${msg.role === "ai" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {msg.role === "ai" ? <Sparkles className="size-4" /> : <User className="size-4" />}
                  </div>
                  <Card className={`p-4 max-w-[85%] border-border/70 text-sm whitespace-pre-wrap leading-relaxed ${msg.role === "ai" ? "bg-card" : "bg-muted/50 border-transparent"}`}>
                    {msg.text}
                  </Card>
                </div>
              ))}
              {askMutation.isPending && (
                <div className="flex items-start gap-4">
                  <div className="size-8 rounded-md shrink-0 flex items-center justify-center bg-primary/10 text-primary">
                    <Sparkles className="size-4" />
                  </div>
                  <Card className="p-4 border-border/70 text-sm bg-card flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> FlowAI is reasoning over ERP data...
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input box */}
        <div className="pt-2 shrink-0">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background/70 p-2 shadow-sm focus-within:border-primary/50 transition-colors">
            <Sparkles className="size-4 text-primary ml-2 shrink-0" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="Ask FlowAI… e.g. 'What's blocking SO-10421?'"
              className="flex-1 bg-transparent outline-none text-sm py-1.5 px-2"
              disabled={askMutation.isPending}
            />
            <Button size="sm" className="h-8 gap-1.5 text-xs shrink-0" onClick={() => handleSend(input)} disabled={askMutation.isPending || !input.trim()}>
              <Send className="size-3.5" /> Ask
            </Button>
          </div>
          <div className="text-center text-[10px] text-muted-foreground mt-2">
            FlowAI uses live inventory, manufacturing, and procurement data to generate insights.
          </div>
        </div>
      </main>
    </>
  );
}
