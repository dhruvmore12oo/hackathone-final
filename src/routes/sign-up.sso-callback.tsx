import { AuthenticateWithRedirectCallback } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-up/sso-callback")({
  head: () => ({ meta: [{ title: "Signing up - FlowERP" }] }),
  component: ClerkCallbackPage,
});

function ClerkCallbackPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="h-8 w-40 rounded bg-muted/60 animate-pulse" />
      <AuthenticateWithRedirectCallback signInForceRedirectUrl="/" signUpForceRedirectUrl="/" />
    </main>
  );
}
