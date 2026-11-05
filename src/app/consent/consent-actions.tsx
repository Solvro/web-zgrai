"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export function ConsentActions() {
  const [pending, setPending] = useState<"accept" | "deny" | null>(null);

  async function respond(accept: boolean) {
    setPending(accept ? "accept" : "deny");
    const { error } = await authClient.oauth2.consent({ accept });
    if (error) {
      setPending(null);
      toast.error(error.message ?? "Something went wrong");
    }
  }

  return (
    <div className="flex w-full gap-2">
      <Button
        variant="outline"
        className="flex-1"
        disabled={pending !== null}
        onClick={() => respond(false)}
      >
        {pending === "deny" && <Spinner data-icon="inline-start" />}
        Deny
      </Button>
      <Button
        className="flex-1"
        disabled={pending !== null}
        onClick={() => respond(true)}
      >
        {pending === "accept" && <Spinner data-icon="inline-start" />}
        Allow
      </Button>
    </div>
  );
}
