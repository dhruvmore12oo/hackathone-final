import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ShoppingCart, ClipboardList, Factory, Boxes, Briefcase } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCurrentUserProfile, chooseInitialRole } from "@/lib/api/auth.functions";

export const Route = createFileRoute("/choose-role")({
  head: () => ({ meta: [{ title: "Choose your role - FlowERP" }] }),
  component: ChooseRolePage,
});

const ROLE_OPTIONS = [
  { role: "BUSINESS_OWNER" as const, label: "Business Owner", desc: "Full visibility across all operations — sales, purchase, manufacturing, inventory", icon: Briefcase, color: "text-primary" },
  { role: "SALES_USER" as const, label: "Sales Manager", desc: "Manage customer orders, deliveries, and revenue tracking", icon: ShoppingCart, color: "text-blue-400" },
  { role: "PURCHASE_USER" as const, label: "Purchase Manager", desc: "Handle vendor orders, procurement, and goods receipt", icon: ClipboardList, color: "text-teal-400" },
  { role: "MANUFACTURING_USER" as const, label: "Manufacturing Operator", desc: "Execute work orders, manage production, and BoMs", icon: Factory, color: "text-purple-400" },
  { role: "INVENTORY_MANAGER" as const, label: "Inventory Manager", desc: "Track stock levels, adjustments, and ledger entries", icon: Boxes, color: "text-amber-400" },
];

function markOnboarded(userId: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(`flowERP_role_selected_${userId}`, "true");
  }
}

function ChooseRolePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const chooseRoleFn = useServerFn(chooseInitialRole);
  const getCurrentUserProfileFn = useServerFn(getCurrentUserProfile);
  const [selectedRole, setSelectedRole] = useState<string>("");

  const profileQuery = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: () => getCurrentUserProfileFn(),
    staleTime: 30000,
  });

  const mutation = useMutation({
    mutationFn: (role: string) => chooseRoleFn({ data: { role: role as any } }),
    onSuccess: (data) => {
      // Mark as onboarded so the root redirect doesn't trigger again
      if (profileQuery.data) {
        markOnboarded(profileQuery.data.id);
      }
      queryClient.invalidateQueries({ queryKey: ["current-user-profile"] });
      navigate({ to: "/" });
    },
  });

  // If user already has a non-default role (admin, or already chose), redirect to dashboard
  const profile = profileQuery.data;
  if (profile && profile.role === "ADMIN") {
    navigate({ to: "/" });
    return null;
  }

  const handleSkip = () => {
    if (profileQuery.data) {
      markOnboarded(profileQuery.data.id);
    }
    navigate({ to: "/" });
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="mx-auto flex justify-center mb-6 w-48">
            <img src="/logo.png" alt="FlowERP Logo" className="w-full h-auto object-contain" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to FlowERP</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose your role to get started. This determines which modules you can access.
          </p>
        </div>

        <div className="space-y-2">
          {ROLE_OPTIONS.map((option) => (
            <button
              key={option.role}
              onClick={() => setSelectedRole(option.role)}
              className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
                selectedRole === option.role
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border/70 bg-card/40 hover:border-border hover:bg-card/60"
              }`}
            >
              <div className={`size-10 rounded-lg flex items-center justify-center bg-muted/40 ${option.color}`}>
                <option.icon className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{option.desc}</div>
              </div>
              <div className={`size-4 rounded-full border-2 transition-colors ${
                selectedRole === option.role ? "border-primary bg-primary" : "border-muted-foreground/40"
              }`}>
                {selectedRole === option.role && (
                  <div className="w-full h-full rounded-full flex items-center justify-center">
                    <div className="size-1.5 rounded-full bg-primary-foreground" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <Button
          className="w-full mt-6 h-11"
          disabled={!selectedRole || mutation.isPending}
          onClick={() => selectedRole && mutation.mutate(selectedRole)}
        >
          {mutation.isPending ? "Setting up your workspace..." : "Continue to FlowERP"}
        </Button>

        <div className="flex items-center justify-center mt-4 gap-1">
          <p className="text-[11px] text-muted-foreground">
            Your role can be changed later by an admin.
          </p>
          <button
            onClick={handleSkip}
            className="text-[11px] text-primary hover:underline"
          >
            Skip for now
          </button>
        </div>
      </div>
    </main>
  );
}
