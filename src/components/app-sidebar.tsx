import { SignInButton, UserButton, useAuth, useUser } from "@clerk/tanstack-react-start";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, Boxes, ShoppingCart, ClipboardList,
  Factory, ListTree, Truck, ScrollText, Sparkles, Workflow, Users,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUserProfile } from "@/lib/api/auth.functions";
import { hasPermission } from "@/lib/auth/roles";

const primary = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, permission: "dashboard:read" },
  { title: "Sales Orders", url: "/sales-orders", icon: ShoppingCart, permission: "sales:read" },
  { title: "Manufacturing", url: "/manufacturing", icon: Factory, permission: "manufacturing:read" },
  { title: "Inventory", url: "/inventory", icon: Boxes, permission: "inventory:read" },
  { title: "Products", url: "/products", icon: Package, permission: "products:read" },
];
const secondary = [
  { title: "Purchase Orders", url: "/purchase-orders", icon: ClipboardList, permission: "purchase:read" },
  { title: "Bill of Materials", url: "/bom", icon: ListTree, permission: "bom:read" },
  { title: "Vendors", url: "/vendors", icon: Truck, permission: "vendors:read" },
  { title: "Audit Logs", url: "/audit-logs", icon: ScrollText, permission: "audit_logs:read" },
  { title: "Admin Console", url: "/admin", icon: Workflow, permission: "admin:manage" },
  { title: "Users & Roles", url: "/users", icon: Users, permission: "admin:manage" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const getCurrentUserProfileFn = useServerFn(getCurrentUserProfile);
  const profileQuery = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: () => getCurrentUserProfileFn(),
    enabled: isLoaded && isSignedIn,
    staleTime: 30000,
  });
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));
  const role = profileQuery.data?.role;
  const canSee = (permission: string) => role ? hasPermission(role, permission) : true;
  const primaryItems = primary.filter((item) => canSee(item.permission));
  const secondaryItems = secondary.filter((item) => canSee(item.permission));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border py-4 h-[72px] flex flex-row items-center px-4 overflow-hidden">
        <div className={`flex items-center shrink-0 transition-all w-full`}>
          <img src="/logo.png" alt="FlowERP Logo" className={`h-11 w-auto object-contain object-left ${collapsed ? "-ml-3" : ""}`} />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Operations</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryItems.map((item) => (
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
              {secondaryItems.map((item) => (
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
        {!isLoaded && (
          <div className="h-8 rounded bg-muted/60 animate-pulse" />
        )}
        {isLoaded && isSignedIn && (
          <div className="flex items-center gap-2.5">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "size-7",
                },
              }}
            />
            {!collapsed && (
              <div className="leading-tight min-w-0">
                <div className="text-xs font-medium truncate">{user?.fullName ?? user?.username ?? "FlowERP User"}</div>
                <div className="text-[10px] text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</div>
                {profileQuery.data && (
                  <Badge variant="outline" className="mt-1 h-4 border-border/70 px-1.5 text-[9px] font-medium">
                    {profileQuery.data.roleLabel}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
        {isLoaded && !isSignedIn && (
          <SignInButton mode="redirect" forceRedirectUrl="/">
            <Button size="sm" className={collapsed ? "size-8 p-0" : "h-8 w-full text-xs"}>
              {collapsed ? "In" : "Sign in"}
            </Button>
          </SignInButton>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
