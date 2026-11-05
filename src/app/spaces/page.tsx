import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { ProblemsList } from "@/components/problems/problems-list";
import { ProblemForm } from "@/components/start/problem-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/session";
import { listProblems } from "@/lib/spaces/dashboard";

// 08 · Your problems: every space you started or joined.
export default function ProblemsPage() {
  return (
    <Suspense fallback={<ProblemsSkeleton />}>
      <Problems />
    </Suspense>
  );
}

async function Problems() {
  const user = await requireUser("/spaces");
  const problems = await listProblems(user.id);
  return (
    <div className="min-h-svh bg-white">
      <AppHeader user={{ name: user.name, email: user.email }} />
      <main className="mx-auto flex max-w-[920px] flex-col gap-9 px-4 pt-11 pb-16 sm:px-6">
        <h1 className="text-[34px] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[40px]">
          Your problems
        </h1>
        <ProblemForm variant="compact" />
        <ProblemsList problems={problems} />
      </main>
    </div>
  );
}

function ProblemsSkeleton() {
  return (
    <main className="mx-auto flex max-w-[920px] flex-col gap-9 px-4 pt-24 pb-16 sm:px-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-36 w-full rounded-[22px]" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </main>
  );
}
