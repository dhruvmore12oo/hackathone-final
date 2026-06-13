import { SidebarTrigger } from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import { Search, Bell, Command, Plus, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";

export function TopBar({ title, breadcrumb, onNewOrder }: { title: string; breadcrumb?: string; onNewOrder?: () => void }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Determine initial theme once component mounts on client
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    if (nextTheme === "light") {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
    setTheme(nextTheme);
  };

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
      
      {/* Theme Toggle Button */}
      <Button
        size="sm"
        variant="ghost"
        className="size-8 p-0"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? (
          <Sun className="size-4 text-amber-400 transition-all hover:scale-110" />
        ) : (
          <Moon className="size-4 text-slate-700 transition-all hover:scale-110" />
        )}
      </Button>

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
