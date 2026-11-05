import { ClientOnly } from "@/components/dashboard/dashboard-provider";
import { SpacesList } from "@/components/dashboard/spaces-list";

export default function SpacesPage() {
  return (
    <ClientOnly>
      <SpacesList />
    </ClientOnly>
  );
}
