import { Badge } from "@/components/ui/badge";
import type { SpaceStatus } from "@/lib/dashboard/types";

export function StatusBadge({ status }: { status: SpaceStatus }) {
  if (status === "draft") return <Badge variant="outline">Draft</Badge>;
  if (status === "closed") return <Badge variant="secondary">Closed</Badge>;
  return (
    <Badge className="bg-emerald-600 text-white">
      <span className="size-1.5 animate-pulse rounded-full bg-white" />
      Live
    </Badge>
  );
}
