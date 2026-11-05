import { Suspense } from "react";
import { ClientOnly } from "@/components/dashboard/dashboard-provider";
import { JoinPage } from "@/components/dashboard/invite/join-page";

export default function JoinRoute({ params }: PageProps<"/join/[code]">) {
  return (
    <main className="flex flex-1 flex-col bg-muted/40">
      <Suspense>
        {params.then(({ code }) => (
          <ClientOnly>
            <JoinPage code={code} />
          </ClientOnly>
        ))}
      </Suspense>
    </main>
  );
}
