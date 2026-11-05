"use server";

import { getSession } from "@/lib/session";
import { continueMaster } from "@/lib/master/budget";
import { startSpace } from "@/lib/master/start";
import { sendDashboardMessage } from "@/lib/spaces/dashboard";
import { createInvite, SpaceError } from "@/lib/spaces/service";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: (userId: string) => Promise<T>): Promise<Result<T>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in first." };
  try {
    return { ok: true, data: await fn(session.user.id) };
  } catch (error) {
    if (error instanceof SpaceError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function startSpaceAction(description: string) {
  return run(async (userId) => {
    if (!description.trim())
      throw new SpaceError("Describe the problem first.");
    const created = await startSpace({ userId, description });
    return { spaceId: created.space.id, code: created.invite_code };
  });
}

export async function createInviteAction(spaceId: string) {
  return run(async (userId) => {
    const invite = await createInvite({ spaceId, userId });
    return { code: invite.invite_code, message: invite.invite_message };
  });
}

export async function messageMasterAction(spaceId: string, text: string) {
  return run(async (userId) => {
    const row = await sendDashboardMessage({ spaceId, userId, text });
    return { id: row.id };
  });
}

export async function continueMasterAction(spaceId: string) {
  return run(async (userId) => {
    await continueMaster({ spaceId, userId });
    return { continued: true };
  });
}
