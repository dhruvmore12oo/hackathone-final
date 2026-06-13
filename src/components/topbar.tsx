import { SidebarTrigger } from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import { Search, Bell, Command, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function TopBar({ title, breadcrumb, onNewOrder }: { title: string; breadcrumb?: string; onNewOrder?: () => void }) {
  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-30 flex items-center px-4 gap-3">
      <SidebarTrigger className="size-8" />
      <Separator orientation="vertical" className="h-5" />
      <div className="flex items-baseline gap-2">
        <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
        {breadcrumb && <span className="text-xs text-muted-foreground">/ {breadcrumb}</span>}
      </div>
      <div className="flex-1" />
      <div className="hidden md:flex items-center h-9 px-3 gap-2 rounded-md bg-card border border-border/70 w-72 text-xs text-muted-foreground hover:border-border transition">
        <Search className="size-3.5" />
        <span>Search orders, products, vendors…</span>
        <div className="ml-auto flex items-center gap-0.5 text-[10px]">
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono"><Command className="inline size-2.5 -mt-0.5"/>K</kbd>
        </div>
      </div>
      <Button size="sm" variant="ghost" className="size-8 p-0 relative">
        <Bell className="size-4" />
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive" />
      </Button>
      {onNewOrder ? (
        <Button size="sm" onClick={onNewOrder} className="h-8 gap-1.5 text-xs">
          <Plus className="size-3.5" /> New Order
        </Button>
      ) : (
        <Button size="sm" asChild className="h-8 gap-1.5 text-xs">
          <Link to="/sales-orders"><Plus className="size-3.5" /> New Order</Link>
        </Button>
      )}
    </header>
  );
}
