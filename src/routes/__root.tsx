import { ClerkProvider, SignInButton, useAuth } from "@clerk/tanstack-react-start";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  Outlet, Link, createRootRouteWithContext, useRouter, useRouterState, HeadContent, Scripts,
  useNavigate,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentUserProfile } from "@/lib/api/auth.functions";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Back to dashboard</Link>
      </div>
    </div>
  );
}


function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FlowERP — From Demand to Delivery" },
      { name: "description", content: "FlowERP is a modern manufacturing ERP — sales orders, inventory, procurement, manufacturing, and delivery in one premium workspace." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "icon", href: "/favicon.png" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>
        <ClerkProvider>{children}</ClerkProvider>
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Checks if a newly signed-in user needs to pick a role, and redirects to /choose-role.
 * This component must render INSIDE QueryClientProvider.
 */
function NewUserRedirectGuard() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isChooseRoleRoute = pathname === "/choose-role";

  const getCurrentUserProfileFn = useServerFn(getCurrentUserProfile);
  const profileQuery = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: () => getCurrentUserProfileFn(),
    enabled: isLoaded && isSignedIn,
    staleTime: 30000,
  });

  useEffect(() => {
    if (!profileQuery.data || isChooseRoleRoute) return;

    const profile = profileQuery.data;
    // Admin users never need role selection
    if (profile.role === "ADMIN") return;

    // Check localStorage — if user already completed onboarding, skip
    const onboardingKey = `flowERP_role_selected_${profile.id}`;
    const alreadyOnboarded = typeof window !== "undefined" && localStorage.getItem(onboardingKey);
    if (alreadyOnboarded) return;

    // Only redirect BUSINESS_OWNER (the default role) to choose-role
    // Other specific roles (SALES_USER, etc.) were already set explicitly
    if (profile.role === "BUSINESS_OWNER") {
      navigate({ to: "/choose-role" });
    } else {
      // User has a specific role — mark as onboarded so we don't check again
      if (typeof window !== "undefined") {
        localStorage.setItem(onboardingKey, "true");
      }
    }
  }, [profileQuery.data, isChooseRoleRoute, navigate]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isAuthRoute = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const isChooseRoleRoute = pathname === "/choose-role";

  // For auth pages and choose-role page, render without sidebar
  if (isAuthRoute || isChooseRoleRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster theme="dark" position="bottom-right" />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* This guard runs inside QueryClientProvider so useQuery works */}
      <NewUserRedirectGuard />
      {!isLoaded && (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
          <div className="h-8 w-40 rounded bg-muted/60 animate-pulse" />
        </div>
      )}
      {isLoaded && isSignedIn && (
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background text-foreground">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Outlet />
            </div>
          </div>
          <Toaster theme="dark" position="bottom-right" />
        </SidebarProvider>
      )}
      {isLoaded && !isSignedIn && (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto flex justify-center mb-10 w-full px-6">
              <img src="/logo.png" alt="FlowERP Logo" className="w-full h-auto object-contain" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Sign in to FlowERP</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your manufacturing workspace is protected by Clerk.
            </p>
            <div className="mt-6 space-y-3">
              <SignInButton mode="redirect" forceRedirectUrl="/">
                <Button className="w-full" size="lg">Sign in as Admin</Button>
              </SignInButton>
              <SignInButton mode="redirect" forceRedirectUrl="/choose-role">
                <Button className="w-full" variant="outline" size="lg">Sign in / Sign up as User</Button>
              </SignInButton>
            </div>
            <p className="text-[11px] text-muted-foreground mt-4">
              Admin: uses the configured admin email. User: pick your role after sign-in.
            </p>
          </div>
        </div>
      )}
      {isLoaded && !isSignedIn && (
        <Toaster theme="dark" position="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
