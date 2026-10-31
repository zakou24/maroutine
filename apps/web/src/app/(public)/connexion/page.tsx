import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAuth } from "@/server/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion · MaRoutine" };

async function RedirectIfSignedIn() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session) redirect("/");
  return null;
}

export default function ConnexionPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6">
        <h1 className="mb-6 text-[28px] leading-[34px] font-bold">MaRoutine</h1>
        <LoginForm />
      </div>
    </main>
  );
}
