import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { auth } from "@/server/auth";

async function SessionGate({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion");
  return children;
}

// La lecture de session reste derrière <Suspense> (Cache Components).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="flex-1 bg-background" aria-busy="true" />}>
      <SessionGate>{children}</SessionGate>
    </Suspense>
  );
}
