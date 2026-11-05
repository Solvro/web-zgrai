"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await signOut();
    router.refresh();
    setPending(false);
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={pending}>
      {pending && <Spinner data-icon="inline-start" />}
      Sign out
    </Button>
  );
}
