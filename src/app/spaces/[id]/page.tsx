import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LiveSession } from "@/components/session/live-session";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/session";
import { getSessionView } from "@/lib/spaces/dashboard";

export default function SessionPage(props: PageProps<"/spaces/[id]">) {
  return (
    <Suspense fallback={<SessionSkeleton />}>
      <Session {...props} />
    </Suspense>
  );
}

async function Session({ params }: PageProps<"/spaces/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/spaces/${id}`);
  const view = await getSessionView(id, user.id);
  if (!view) notFound();
  return (
    <LiveSession initial={view} user={{ name: user.name, email: user.email }} />
  );
}

function SessionSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1240px] flex-wrap gap-9 px-4 py-20 sm:px-6">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-16 w-2/3 rounded-2xl" />
        <Skeleton className="h-16 w-1/2 self-end rounded-2xl" />
      </div>
      <Skeleton className="h-96 flex-[1_1_380px] rounded-[28px]" />
    </div>
  );
}
