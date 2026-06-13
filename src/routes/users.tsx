import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, UsersRound } from "lucide-react";

import { TopBar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listUsers, updateUserRole } from "@/lib/api/auth.functions";
import { roleLabels, USER_ROLES, type UserRole } from "@/lib/auth/roles";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "Users & Roles - FlowERP" }] }),
  component: UsersPage,
});

function UsersPage() {
  const queryClient = useQueryClient();
  const listUsersFn = useServerFn(listUsers);
  const updateUserRoleFn = useServerFn(updateUserRole);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsersFn(),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) => updateUserRoleFn({ data: { userId, role } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["current-user-profile"] });
      toast.success("User role updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update user role.");
    },
  });

  const users = usersQuery.data ?? [];

  return (
    <>
      <TopBar title="Users & Roles" breadcrumb="Admin" />
      <main className="p-6 space-y-4 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Users & Roles</h2>
            <p className="text-sm text-muted-foreground">Assign PRD designations and module access from one admin surface</p>
          </div>
          <div className="size-9 rounded-md bg-primary/15 text-primary flex items-center justify-center">
            <ShieldCheck className="size-4" />
          </div>
        </div>

        <Card className="border-border/70 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Designation</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.isLoading && Array.from({ length: 4 }).map((_, index) => (
                <tr key={index} className="border-t border-border/60">
                  <td className="px-4 py-3" colSpan={4}>
                    <div className="h-4 rounded bg-muted/60 animate-pulse" />
                  </td>
                </tr>
              ))}
              {!usersQuery.isLoading && usersQuery.isError && (
                <tr className="border-t border-border/60">
                  <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={4}>
                    Users could not be loaded. Only admins can manage designations.
                  </td>
                </tr>
              )}
              {!usersQuery.isLoading && !usersQuery.isError && users.length === 0 && (
                <tr className="border-t border-border/60">
                  <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={4}>
                    No synced users yet. Sign in once to create your user row.
                  </td>
                </tr>
              )}
              {!usersQuery.isLoading && !usersQuery.isError && users.map((user) => (
                <tr key={user.id} className="border-t border-border/60 hover:bg-accent/40 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                        <UsersRound className="size-3.5" />
                      </div>
                      <span className="font-medium">{user.name ?? "FlowERP User"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge className={user.isActive ? "bg-success/15 text-success border-success/20 text-[10px]" : "bg-muted text-muted-foreground border-border text-[10px]"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 w-72">
                    <Select
                      value={user.role}
                      onValueChange={(role) => roleMutation.mutate({ userId: user.id, role: role as UserRole })}
                      disabled={roleMutation.isPending}
                    >
                      <SelectTrigger className="h-8 bg-card text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </>
  );
}
