import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { TabBar } from "@/components/tab-bar";
import { QueryProvider } from "@/lib/query-client";
import { getAuth } from "@/server/auth";

async function SessionGate({ children }: { children: ReactNode }) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion");
  return children;
}

// La lecture de session reste derrière <Suspense> (Cache Components).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="flex-1 bg-background" aria-busy="true" />}>
      <SessionGate>
        <QueryProvider>
          <div className="flex flex-1">
            <AppNav />
            {/* Sur iPhone, réserve la hauteur de la barre d'onglets et de la zone sûre. */}
            <div className="flex min-w-0 flex-1 flex-col pb-[calc(52px+env(safe-area-inset-bottom))] md:pb-0">
              {children}
            </div>
          </div>
          <TabBar />
        </QueryProvider>
      </SessionGate>
    </Suspense>
  );
}
