import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { Workflow } from "lucide-react";

export const Route = createFileRoute("/sign-in")({
  head: () => ({ meta: [{ title: "Sign in - FlowERP" }] }),
  component: SignInPage,
});

function SignInPage() {
  return (
    <main className="min-h-screen bg-background text-foreground grid lg:grid-cols-[0.95fr_1.05fr]">
      <section className="hidden lg:flex flex-col justify-center items-center border-r border-border/70 bg-card/40 p-10 relative overflow-hidden">
        <div className="w-full max-w-md flex flex-col items-start -mt-20">
          <img src="/logo.png" alt="FlowERP Logo" className="w-full scale-125 origin-left h-auto object-contain mb-16" />

          <div className="w-full">
            <div className="text-xs font-medium uppercase tracking-wider text-primary">Hackathon ERP</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">One operating system for Shiv Furniture Works.</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Sales, stock, procurement, manufacturing, and audit trails connected in one realtime workflow.
            </p>
          </div>

          <div className="text-xs text-muted-foreground mt-12">Admin bootstrap: dhruvmoreutk@gmail.com</div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="mb-10 w-[50%] flex justify-center lg:hidden">
            <img src="/logo.png" alt="FlowERP Logo" className="w-full h-auto object-contain" />
          </div>
          <div className="w-full">
            <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/" />
          </div>
        </div>
      </section>
    </main>
  );
}
