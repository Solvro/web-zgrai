import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { EntryHeader } from "@/components/app-header";
import { SleepyBots } from "@/components/brand/sleepy-bots";
import { InviteCard } from "@/components/start/invite-card";
import { requireUser } from "@/lib/session";
import { getSpaceTitle, resolveInvite } from "@/lib/spaces/dashboard";
import { normalizeInviteCode } from "@/lib/spaces/invite";
import { buildInviteMessage } from "@/lib/spaces/invite-message";
import { appOrigin } from "@/lib/spaces/urls";

// 03 · The agents are awake and the session exists: send the invite.
export default function InvitePage(props: PageProps<"/spaces/[id]/invite">) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-white">
      <SleepyBots awake />
      <Suspense fallback={<EntryHeader />}>
        <InviteContent {...props} />
      </Suspense>
    </div>
  );
}

async function InviteContent({
  params,
  searchParams,
}: PageProps<"/spaces/[id]/invite">) {
  const { id } = await params;
  const { code } = await searchParams;
  const user = await requireUser(`/spaces/${id}/invite`);
  const space = await getSpaceTitle(id, user.id);
  if (!space) notFound();
  if (space.role !== "initiator" || space.status !== "open")
    redirect(`/spaces/${id}`);

  const invite = typeof code === "string" ? await resolveInvite(code) : null;
  const message =
    invite?.spaceId === id && typeof code === "string"
      ? buildInviteMessage({
          origin: appOrigin,
          code: normalizeInviteCode(code),
        })
      : null;

  return (
    <>
      <EntryHeader user={user} />
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pt-4 pb-20 sm:px-6">
        <div className="flex w-full max-w-[600px] flex-col items-center gap-[22px] text-center">
          <div className="flex flex-col items-center gap-2.5">
            <h1 className="text-[34px] leading-[1.05] font-semibold tracking-[-0.04em] text-balance sm:text-[44px]">
              {space.title}
            </h1>
            <p className="text-[17px] leading-normal text-ink-soft">
              Send this to your group. Each person pastes it into their own AI
              agent, and it joins for them.
            </p>
          </div>
          <InviteCard spaceId={id} initialMessage={message} />
        </div>
      </main>
    </>
  );
}
