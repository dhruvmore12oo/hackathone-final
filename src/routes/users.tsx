import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Users, Search, Filter, Download, MoreHorizontal, UserPlus,
  ShieldCheck, ShieldBan, ShieldAlert, Key, Building2, UserRound,
  Mail, Phone, LogOut, CheckCircle2, History, X
} from "lucide-react";

import { TopBar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

import {
  getUsers, getUserActivity, getUserAuditLogs,
  updateUser, updateUserStatus, updateUserRole
} from "@/lib/api/users.functions";
import { roleLabels, rolePermissions, USER_ROLES, type UserRole } from "@/lib/auth/roles";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "User Management - FlowERP" }] }),
  component: UsersPage,
});

function UsersPage() {
  const queryClient = useQueryClient();
  const getUsersFn = useServerFn(getUsers);
  
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getUsersFn(),
  });

  const users = usersQuery.data ?? [];
  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <TopBar title="User Management" breadcrumb="System Administration" />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Enterprise Users</h2>
            <p className="text-sm text-muted-foreground">Manage user access, security roles, and system activity.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Download className="size-4" /> Export CSV
            </Button>
            <Button size="sm" className="h-9 gap-2">
              <UserPlus className="size-4" /> Invite User
            </Button>
          </div>
        </div>

        <Card className="border-border/70 overflow-hidden flex flex-col shadow-sm">
          <div className="p-4 border-b border-border/60 flex items-center justify-between gap-4 bg-muted/20">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                placeholder="Search users..." 
                className="pl-9 h-9 bg-background" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 gap-2 text-muted-foreground border-border/70">
                <Filter className="size-4" /> Role
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-muted-foreground border-border/70">
                <Filter className="size-4" /> Status
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border/60">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium w-8"><input type="checkbox" className="rounded border-border/70 bg-transparent" /></th>
                  <th className="px-4 py-3 font-medium">User Profile</th>
                  <th className="px-4 py-3 font-medium">Role & Department</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last Login</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {usersQuery.isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-4"><div className="h-10 rounded bg-muted/60 animate-pulse" /></td></tr>
                ))}
                {!usersQuery.isLoading && filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className="hover:bg-accent/30 transition cursor-pointer group"
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" className="rounded border-border/70 bg-transparent" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 border border-border/50">
                          <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                            {user.name?.substring(0, 2).toUpperCase() ?? user.email.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors">{user.name ?? "Pending User"}</div>
                          <div className="text-[11px] text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-xs">{roleLabels[user.role as keyof typeof roleLabels]}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{user.department ?? "General"} • {user.jobTitle ?? "Staff"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={user.isActive ? "bg-success/15 text-success hover:bg-success/20 border-success/20 text-[10px]" : "bg-muted text-muted-foreground border-border text-[10px]"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground">
                      {user.lastLoginAt ? format(new Date(user.lastLoginAt), "MMM d, yyyy HH:mm") : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 text-xs">
                          <DropdownMenuItem onClick={() => setSelectedUserId(user.id)}>View Profile</DropdownMenuItem>
                          <DropdownMenuItem>Reset Password</DropdownMenuItem>
                          <DropdownMenuItem className={user.isActive ? "text-destructive" : "text-success"}>
                            {user.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-border/60 bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
            <div>Showing {filteredUsers.length} of {users.length} users</div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" disabled>Prev</Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" disabled>Next</Button>
            </div>
          </div>
        </Card>
      </main>

      {/* User Management Form View (Slide-over) */}
      <UserManagementSheet 
        userId={selectedUserId} 
        onClose={() => setSelectedUserId(null)} 
        users={users} 
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })} 
      />
    </>
  );
}

function UserManagementSheet({ userId, onClose, users, onUpdated }: { userId: string | null, onClose: () => void, users: any[], onUpdated: () => void }) {
  const user = users.find(u => u.id === userId);
  const getActivityFn = useServerFn(getUserActivity);
  const getLogsFn = useServerFn(getUserAuditLogs);
  const updateRoleFn = useServerFn(updateUserRole);
  const updateStatusFn = useServerFn(updateUserStatus);
  const updateUserFn = useServerFn(updateUser);

  const [activeTab, setActiveTab] = useState("profile");
  
  // Profile state
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");

  // Populate state when user changes
  if (user && name === "" && user.name) {
    setName(user.name);
    setDepartment(user.department || "");
    setJobTitle(user.jobTitle || "");
    setPhone(user.phone || "");
  }

  const activityQuery = useQuery({
    queryKey: ["user-activity", userId],
    queryFn: () => getActivityFn({ data: userId! }),
    enabled: !!userId && activeTab === "activity",
  });

  const logsQuery = useQuery({
    queryKey: ["user-logs", userId],
    queryFn: () => getLogsFn({ data: userId! }),
    enabled: !!userId && activeTab === "activity",
  });

  const saveProfileMutation = useMutation({
    mutationFn: () => updateUserFn({ data: { id: userId!, name, department, jobTitle, phone } }),
    onSuccess: () => { toast.success("Profile updated"); onUpdated(); },
    onError: () => toast.error("Failed to update profile")
  });

  const updateRoleMutation = useMutation({
    mutationFn: (role: UserRole) => updateRoleFn({ data: { id: userId!, role } }),
    onSuccess: () => { toast.success("Role updated"); onUpdated(); },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (isActive: boolean) => updateStatusFn({ data: { id: userId!, isActive } }),
    onSuccess: () => { toast.success("Status updated"); onUpdated(); },
  });

  if (!user) return null;

  return (
    <Sheet open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[90vw] sm:max-w-[600px] p-0 flex flex-col bg-background border-l border-border/70 sm:rounded-l-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-muted/20 border-b border-border/60 relative">
          <Button variant="ghost" size="icon" className="absolute right-4 top-4 size-8 rounded-full" onClick={onClose}>
            <X className="size-4" />
          </Button>
          
          <div className="flex items-start gap-4 mt-2">
            <Avatar className="size-16 border-2 border-background shadow-sm ring-1 ring-border/50">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {user.name?.substring(0, 2).toUpperCase() ?? user.email.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold truncate tracking-tight">{user.name ?? "Pending User"}</h2>
                <Badge className={user.isActive ? "bg-success/15 text-success border-success/20 text-[10px]" : "bg-muted text-muted-foreground border-border text-[10px]"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1.5"><Mail className="size-3" /> {user.email}</span>
                <span className="flex items-center gap-1.5"><Building2 className="size-3" /> {user.department || "No Dept"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs border-border/70" onClick={() => saveProfileMutation.mutate()} disabled={saveProfileMutation.isPending}>
                  Save Changes
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="secondary" className="h-7 text-xs">Actions</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="text-xs">
                    <DropdownMenuItem className="gap-2"><Key className="size-3" /> Reset Password</DropdownMenuItem>
                    <DropdownMenuItem className="gap-2"><LogOut className="size-3" /> Force Logout</DropdownMenuItem>
                    <DropdownMenuItem 
                      className={`gap-2 ${user.isActive ? "text-destructive" : "text-success"}`}
                      onClick={() => toggleStatusMutation.mutate(!user.isActive)}
                    >
                      {user.isActive ? <ShieldBan className="size-3" /> : <CheckCircle2 className="size-3" />}
                      {user.isActive ? "Deactivate Account" : "Activate Account"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Body Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-2 border-b border-border/50">
            <TabsList className="bg-transparent p-0 h-auto gap-6 flex-wrap">
              <TabsTrigger value="profile" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 text-xs tracking-wide uppercase data-[state=active]:text-foreground text-muted-foreground">Profile Details</TabsTrigger>
              <TabsTrigger value="roles" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 text-xs tracking-wide uppercase data-[state=active]:text-foreground text-muted-foreground">Role & Access</TabsTrigger>
              <TabsTrigger value="account" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 text-xs tracking-wide uppercase data-[state=active]:text-foreground text-muted-foreground">Security</TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 text-xs tracking-wide uppercase data-[state=active]:text-foreground text-muted-foreground">Activity Log</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 p-6">
            <TabsContent value="profile" className="mt-0 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2"><UserRound className="size-4 text-muted-foreground" /> Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Full Name</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Email Address (Read-only)</Label>
                    <Input value={user.email} disabled className="h-8 text-sm bg-muted/30" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Phone Number</Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 ..." className="h-8 text-sm" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Building2 className="size-4 text-muted-foreground" /> Organization</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Department</Label>
                    <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Sales" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Job Title</Label>
                    <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Regional Manager" className="h-8 text-sm" />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="roles" className="mt-0 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Role Assignment</h3>
                <p className="text-xs text-muted-foreground">The assigned role determines access across FlowERP modules.</p>
                
                <div className="grid gap-3">
                  {USER_ROLES.map((role) => {
                    const isSelected = user.role === role;
                    return (
                      <div 
                        key={role} 
                        onClick={() => !isSelected && updateRoleMutation.mutate(role)}
                        className={`p-3 rounded-lg border text-left flex items-start gap-3 transition-all ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/60 hover:border-border cursor-pointer'}`}
                      >
                        <div className={`mt-0.5 size-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-primary' : 'border-muted-foreground'}`}>
                          {isSelected && <div className="size-2 rounded-full bg-primary" />}
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>{roleLabels[role]}</div>
                          <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                            {rolePermissions[role].includes("*") 
                              ? "Full system access. Can manage users, settings, and bypass approvals."
                              : `Access to: ${rolePermissions[role].map(p => p.split(':')[0]).filter((v,i,a)=>a.indexOf(v)===i).join(', ')}.`}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="account" className="mt-0 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Key className="size-4 text-muted-foreground" /> Security & Access</h3>
                
                <div className="p-4 rounded-lg border border-border/60 bg-muted/10 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Account Created</span>
                    <span className="font-medium">{format(new Date(user.createdAt), "PPp")}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Last Login</span>
                    <span className="font-medium">{user.lastLoginAt ? format(new Date(user.lastLoginAt), "PPp") : "Never logged in"}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={user.isActive ? "bg-success/15 text-success border-success/20" : "bg-muted text-muted-foreground"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/50">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Danger Zone</h4>
                  <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-destructive">Deactivate User</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">Prevent user from logging in without deleting data.</div>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => toggleStatusMutation.mutate(false)} disabled={!user.isActive}>Deactivate</Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-0 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2"><History className="size-4 text-muted-foreground" /> Recent Audit Logs</h3>
                
                {logsQuery.isLoading ? (
                  <div className="space-y-3">
                    <div className="h-12 bg-muted/40 animate-pulse rounded" />
                    <div className="h-12 bg-muted/40 animate-pulse rounded" />
                  </div>
                ) : logsQuery.data?.length === 0 ? (
                  <div className="text-center p-6 border border-dashed border-border/70 rounded-lg text-muted-foreground text-sm">
                    No activity recorded for this user yet.
                  </div>
                ) : (
                  <div className="relative pl-4 space-y-4 before:absolute before:inset-y-2 before:left-[7px] before:w-px before:bg-border/60">
                    {logsQuery.data?.map(log => (
                      <div key={log.id} className="relative">
                        <div className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary/20 border border-primary/50" />
                        <div className="p-3 rounded-md border border-border/50 bg-muted/10 text-sm">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-xs">{log.module} • {log.action}</span>
                            <span className="text-[10px] text-muted-foreground">{format(new Date(log.timestamp), "MMM d, HH:mm")}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{log.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
