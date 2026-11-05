"use client";

import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useHydrated } from "@/hooks/use-hydrated";
import { ensureSeeded } from "@/lib/dashboard/seed";
import { startTicker } from "@/lib/dashboard/simulation";

// The mock store lives in the browser only, so seed it once on the client.
if (typeof window !== "undefined") ensureSeeded();

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => startTicker(), []);
  return <TooltipProvider>{children}</TooltipProvider>;
}

// Mock data and relative times differ between server and client, so views
// that read spaces render on the client only, until they read from the server.
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  if (hydrated) return children;
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
