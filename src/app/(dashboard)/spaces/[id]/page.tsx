import { Suspense } from "react";
import { ClientOnly } from "@/components/dashboard/dashboard-provider";
import { SpaceView } from "@/components/dashboard/space-view";

export default function SpacePage({ params }: PageProps<"/spaces/[id]">) {
  return (
    <Suspense>
      {params.then(({ id }) => (
        <ClientOnly>
          <SpaceView id={id} />
        </ClientOnly>
      ))}
    </Suspense>
  );
}
