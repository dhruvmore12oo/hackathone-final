import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { TopBar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, MailWarning, PieChart, Activity, ShieldCheck, Clock } from "lucide-react";
import { getAdminDashboardStats } from "@/lib/api/users.functions";
import { roleLabels } from "@/lib/auth/roles";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "System Admin - FlowERP" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const getAdminDashboardStatsFn = useServerFn(getAdminDashboardStats);
  const statsQuery = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: () => getAdminDashboardStatsFn(),
  });

  const stats = statsQuery.data;

  const kpis = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, tone: "text-primary" },
    { label: "Active Users", value: stats?.activeUsers ?? 0, icon: UserCheck, tone: "text-success" },
    { label: "Inactive Users", value: stats?.inactiveUsers ?? 0, icon: UserX, tone: "text-muted-foreground" },
    { label: "Pending Invitations", value: stats?.pendingInvitations ?? 0, icon: MailWarning, tone: "text-warning" },
  ];

  return (
    <>
      <TopBar title="System Administrator" breadcrumb="Dashboard" />
      <main className="p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Admin Console</h2>
            <p className="text-sm text-muted-foreground mt-1">Enterprise user and system management.</p>
          </div>
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 gap-1.5 py-1">
            <ShieldCheck className="size-3.5" />
            System Health: Optimal
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="p-5 border-border/70 hover:border-border transition flex flex-col justify-between h-32 relative overflow-hidden group">
              <div className="flex items-start justify-between relative z-10">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</div>
                <kpi.icon className={`size-4 ${kpi.tone}`} />
              </div>
              <div className="text-3xl font-bold tracking-tight relative z-10">
                {statsQuery.isLoading ? <div className="h-8 w-16 bg-muted/60 animate-pulse rounded" /> : kpi.value}
              </div>
              <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition duration-500`}>
                <kpi.icon className="size-24" />
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-5 border-border/70 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Role Distribution</h3>
            </div>
            <div className="space-y-3">
              {statsQuery.isLoading && <div className="h-32 bg-muted/60 animate-pulse rounded" />}
              {stats?.roleDistribution.map((rd) => (
                <div key={rd.role} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-primary" />
                    <span className="font-medium text-muted-foreground">{roleLabels[rd.role as keyof typeof roleLabels]}</span>
                  </div>
                  <span className="tabular-nums font-semibold">{rd.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 border-border/70 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Recent Logins</h3>
            </div>
            <div className="space-y-4">
              {statsQuery.isLoading && <div className="h-32 bg-muted/60 animate-pulse rounded" />}
              {stats?.recentLogins.length === 0 && <p className="text-sm text-muted-foreground">No recent login data.</p>}
              {stats?.recentLogins.map((user) => (
                <div key={user.id} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                      {user.name?.charAt(0) ?? user.email.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium leading-none">{user.name ?? "User"}</div>
                      <div className="text-xs text-muted-foreground mt-1">{user.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium">{roleLabels[user.role as keyof typeof roleLabels]}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-1 mt-1">
                      <Clock className="size-3" />
                      {user.lastLoginAt ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true }) : 'Never'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
