import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, Boxes, ShoppingCart, ClipboardList,
  Factory, ListTree, Truck, ScrollText, Sparkles, Workflow,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const primary = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Sales Orders", url: "/sales-orders", icon: ShoppingCart },
  { title: "Manufacturing", url: "/manufacturing", icon: Factory },
  { title: "Inventory", url: "/inventory", icon: Boxes },
  { title: "Products", url: "/products", icon: Package },
];
const secondary = [
  { title: "Purchase Orders", url: "/purchase-orders", icon: ClipboardList },
  { title: "Bill of Materials", url: "/bom", icon: ListTree },
  { title: "Vendors", url: "/vendors", icon: Truck },
  { title: "Audit Logs", url: "/audit-logs", icon: ScrollText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border h-14 flex-row items-center px-4 gap-2">
        <div className="size-7 rounded-md bg-gradient-to-br from-primary to-chart-5 flex items-center justify-center shrink-0">
          <Workflow className="size-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">FlowERP</div>
            <div className="text-[10px] text-muted-foreground -mt-0.5">Demand → Delivery</div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Operations</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {primary.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground">
                    <Link to={item.url} className="flex items-center gap-2.5">
                      <item.icon className="size-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-2">
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Supply Chain</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {secondary.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground">
                    <Link to={item.url} className="flex items-center gap-2.5">
                      <item.icon className="size-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-2">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/copilot")} className="data-[active=true]:bg-sidebar-accent">
                  <Link to="/copilot" className="flex items-center gap-2.5">
                    <Sparkles className="size-4 shrink-0 text-primary" />
                    {!collapsed && (
                      <span className="text-sm flex items-center gap-2">
                        FlowAI Copilot
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">NEW</span>
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="size-7"><AvatarFallback className="bg-primary/15 text-primary text-xs font-medium">AD</AvatarFallback></Avatar>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-xs font-medium">Admin</div>
              <div className="text-[10px] text-muted-foreground">admin@flowerp.io</div>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
