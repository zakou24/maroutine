"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      className="h-11 rounded-lg px-4 text-[15px]"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/connexion");
      }}
    >
      Se déconnecter
    </Button>
  );
}
