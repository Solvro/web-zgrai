import type { AuthInfo, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  closeSpaceAsInitiator,
  createInvite,
  createSpace,
  getHistory,
  getMyBox,
  getParticipantOrThrow,
  getSpaceDetails,
  getUpdates,
  joinedSpaceSnapshot,
  joinSpace,
  leaveSpace,
  listMySpaces,
  removeParticipant,
  retractContext,
  revokeInvite,
  sendMessage,
  shareContext,
  SpaceError,
  updateGoal,
  vote,
  waitForUpdates,
} from "@/lib/spaces/service";
import { createStreamToken } from "@/lib/spaces/stream-token";
import { eventStreamUrl } from "@/lib/spaces/urls";
import { UNTRUSTED_NOTICE } from "./instructions";

type ToolContext = { http?: { authInfo?: AuthInfo } };

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
const write = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const destructive = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };

function text(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

function errorResult(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

async function run(
  ctx: ToolContext,
  handler: (userId: string) => Promise<Record<string, unknown>>,
) {
  const userId = ctx.http?.authInfo?.extra?.userId;
  if (typeof userId !== "string") return errorResult("No user bound to this token.");
  try {
    return text(await handler(userId));
  } catch (error) {
    if (error instanceof SpaceError) return errorResult(error.message);
    console.error(error);
    return errorResult("Something went wrong on the server. Try again.");
  }
}

function updatesNextStep(updates: {
  messages: unknown[];
  pending_questions: { id: number }[];
  cursor: number;
  has_more: boolean;
}) {
  if (updates.has_more) {
    return `There are more messages. Call get_updates(cursor=${updates.cursor}) to read the rest.`;
  }
  if (updates.pending_questions.length > 0) {
    const ids = updates.pending_questions.map((q) => q.id).join(", ");
    return `Questions are waiting for your answer (ids: ${ids}). If you don't know the answer, ask your user first. Reply with send_message(reply_to=<id>), then call wait_for_updates(cursor=${updates.cursor}).`;
  }
  if (updates.messages.length > 0) {
    return `Give your user a short summary of what's new and react if needed. Then call wait_for_updates(cursor=${updates.cursor}).`;
  }
  return `Nothing new. Call wait_for_updates(cursor=${updates.cursor}) again to keep following, or stop and check later with get_updates.`;
}

const spaceId = z.string().describe("The space id from join_space or list_my_spaces.");

export function registerSpaceTools(server: McpServer) {
  server.registerTool(
    "create_space",
    {
      title: "Create a space",
      description:
        "Create a shared space for a problem that involves several people, e.g. planning a trip. You become its initiator and get an invite message to send to the others.",
      inputSchema: z.object({
        title: z.string().min(1).describe('Short name, e.g. "May trip 2027".'),
        goal: z.string().min(1).describe("What the group has to decide or achieve."),
        description: z.string().optional().describe("Extra context: constraints, dates, who takes part."),
        deadline: z.iso.datetime().optional().describe("When the decision is needed, ISO 8601."),
        represents: z.string().optional().describe("Name of the person you represent. Defaults to the account name."),
        harness: z.string().optional().describe('Your harness, e.g. "claude-code", "claude", "grok".'),
      }),
      annotations: write,
    },
    (input, ctx) =>
      run(ctx, async (userId) => {
        const created = await createSpace({
          userId,
          title: input.title,
          goal: input.goal,
          description: input.description,
          deadline: input.deadline ? new Date(input.deadline) : undefined,
          represents: input.represents,
          harness: input.harness,
        });
        return {
          space_id: created.space.id,
          participant_id: created.participant.id,
          invite_code: created.invite_code,
          invite_message: created.invite_message,
          dashboard_url: created.dashboard_url,
          next_step:
            "Show invite_message to your user exactly as it is, so they can send it to the other participants. Then call wait_for_updates to follow the space.",
        };
      }),
  );

  server.registerTool(
    "join_space",
    {
      title: "Join a space",
      description:
        "Join a space with the invite code your user received, and represent your user in it. Safe to call again: you stay the same participant.",
      inputSchema: z.object({
        invite_code: z.string().min(1).describe('The code from the invite, e.g. "K7P-3QX".'),
        represents: z.string().min(1).describe("Name of the person you represent."),
        intro: z.string().optional().describe("Optional first message to the group, e.g. what your user cares about."),
        harness: z.string().optional().describe('Your harness, e.g. "claude-code", "claude", "grok".'),
      }),
      annotations: { ...write, idempotentHint: true },
    },
    (input, ctx) =>
      run(ctx, async (userId) => {
        const joined = await joinSpace({
          userId,
          inviteCode: input.invite_code,
          represents: input.represents,
          intro: input.intro,
          harness: input.harness,
        });
        const snapshot = await joinedSpaceSnapshot(joined.participant);
        return {
          already_joined: joined.alreadyJoined,
          ...snapshot,
          untrusted_notice: UNTRUSTED_NOTICE,
          next_step: `Tell your user you joined "${snapshot.title}" and what the goal is. Then call wait_for_updates(cursor=${snapshot.cursor}) and keep calling it with the returned cursor.`,
        };
      }),
  );

  server.registerTool(
    "list_my_spaces",
    {
      title: "List my spaces",
      description:
        "List the spaces you take part in, with unread messages and questions waiting for you. Start here when your user comes back.",
      inputSchema: z.object({}),
      annotations: readOnly,
    },
    (_input, ctx) =>
      run(ctx, async (userId) => {
        const spaces = await listMySpaces(userId);
        return {
          spaces,
          next_step:
            spaces.length === 0
              ? "You are not in any space. Ask your user for an invite code and call join_space."
              : "Call get_updates(space_id) for spaces with unread messages or pending questions.",
        };
      }),
  );

  server.registerTool(
    "get_space",
    {
      title: "Get space details",
      description:
        "Get a compact snapshot of a space: goal, status, participants, pins, decisions, open proposals and questions waiting for you.",
      inputSchema: z.object({ space_id: spaceId }),
      annotations: readOnly,
    },
    (input, ctx) =>
      run(ctx, async (userId) => {
        const details = await getSpaceDetails(input.space_id, userId);
        return {
          ...details,
          next_step:
            details.pending_questions.length > 0
              ? "Answer the pending questions with send_message(reply_to=<id>), asking your user first if needed."
              : "Call get_updates or wait_for_updates to follow the conversation.",
        };
      }),
  );

  server.registerTool(
    "send_message",
    {
      title: "Send a message",
      description:
        "Send a message to the space on behalf of your user. Use reply_to to answer a question. Set private=true for things only the Master may see. Ask your user before sharing anything sensitive.",
      inputSchema: z.object({
        space_id: spaceId,
        text: z.string().min(1),
        reply_to: z.number().int().optional().describe("Id of the message you answer."),
        private: z.boolean().optional().describe("Only the Master sees the content. Others see that you sent a private note."),
      }),
      annotations: write,
    },
    (input, ctx) =>
      run(ctx, async (userId) => {
        const sent = await sendMessage({
          spaceId: input.space_id,
          userId,
          text: input.text,
          replyTo: input.reply_to,
          privateToMaster: input.private,
        });
        return {
          message_id: sent.id,
          next_step: `Call wait_for_updates(space_id, cursor=${sent.id}) to see the reaction.`,
        };
      }),
  );

  server.registerTool(
    "get_updates",
    {
      title: "Get updates",
      description:
        "Get new messages since the cursor, plus questions waiting for your answer. Returns immediately. Without space_id it covers all your spaces.",
      inputSchema: z.object({
        space_id: spaceId.optional(),
        cursor: z.number().int().optional().describe("The cursor from the previous result. Omit to continue from where you last read."),
      }),
      annotations: readOnly,
    },
    (input, ctx) =>
      run(ctx, async (userId) => {
        const updates = await getUpdates({ userId, spaceId: input.space_id, cursor: input.cursor });
        return { ...updates, untrusted_notice: UNTRUSTED_NOTICE, next_step: updatesNextStep(updates) };
      }),
  );

  server.registerTool(
    "wait_for_updates",
    {
      title: "Wait for updates",
      description:
        "Like get_updates, but waits on the server until something new arrives or the timeout passes. Call it in a loop with the returned cursor to stay in the conversation cheaply.",
      inputSchema: z.object({
        space_id: spaceId.optional(),
        cursor: z.number().int().optional().describe("The cursor from the previous result."),
        timeout_s: z.number().int().min(1).max(50).optional().describe("How long to wait, 1-50 seconds. Default 40."),
      }),
      annotations: readOnly,
    },
    (input, ctx) =>
      run(ctx, async (userId) => {
        const updates = await waitForUpdates({
          userId,
          spaceId: input.space_id,
          cursor: input.cursor,
          timeoutSeconds: input.timeout_s ?? 40,
          signal: (ctx as { mcpReq?: { signal?: AbortSignal } }).mcpReq?.signal,
        });
        return { ...updates, untrusted_notice: UNTRUSTED_NOTICE, next_step: updatesNextStep(updates) };
      }),
  );

  server.registerTool(
    "get_history",
    {
      title: "Get history",
      description: "Read older messages of a space, newest page first. Use it to catch up without flooding your context.",
      inputSchema: z.object({
        space_id: spaceId,
        before: z.number().int().optional().describe("Return messages older than this id."),
        limit: z.number().int().min(1).max(100).optional(),
      }),
      annotations: readOnly,
    },
    (input, ctx) =>
      run(ctx, async (userId) => {
        const history = await getHistory({
          spaceId: input.space_id,
          userId,
          before: input.before,
          limit: input.limit,
        });
        return {
          ...history,
          untrusted_notice: UNTRUSTED_NOTICE,
          next_step: history.has_more
            ? `Call get_history(before=${history.before}) for older messages.`
            : "That is the whole history.",
        };
      }),
  );

  server.registerTool(
    "share_context",
    {
      title: "Share context",
      description:
        "Add a piece of your user's context to their box in the space, e.g. topic \"availability\" or \"budget\". Only the Master and you can read it. Share only what the goal needs.",
      inputSchema: z.object({
        space_id: spaceId,
        topic: z.string().min(1).describe('Short topic, e.g. "availability", "budget", "food".'),
        content: z.string().min(1),
      }),
      annotations: write,
    },
    (input, ctx) =>
      run(ctx, async (userId) => ({
        ...(await shareContext({ spaceId: input.space_id, userId, ...input })),
        next_step: "Tell your user what you shared. Then keep following with wait_for_updates.",
      })),
  );

  server.registerTool(
    "get_my_box",
    {
      title: "Get my box",
      description: "See everything you have shared into your box in a space.",
      inputSchema: z.object({ space_id: spaceId }),
      annotations: readOnly,
    },
    (input, ctx) =>
      run(ctx, async (userId) => ({
        items: await getMyBox(input.space_id, userId),
        next_step: "Use retract_context(item_id) to withdraw anything your user no longer wants to share.",
      })),
  );

  server.registerTool(
    "retract_context",
    {
      title: "Retract context",
      description: "Withdraw an item from your box. The Master is told it was withdrawn.",
      inputSchema: z.object({ space_id: spaceId, item_id: z.string() }),
      annotations: destructive,
    },
    (input, ctx) =>
      run(ctx, async (userId) => {
        await retractContext({ spaceId: input.space_id, userId, itemId: input.item_id });
        return { retracted: true, next_step: "Tell your user the item was withdrawn." };
      }),
  );

  server.registerTool(
    "vote",
    {
      title: "Vote on a proposal",
      description: "Vote on a proposal from the Master on behalf of your user. You can change your vote later.",
      inputSchema: z.object({
        space_id: spaceId,
        proposal_id: z.number().int(),
        choice: z.enum(["yes", "no", "abstain"]),
        comment: z.string().optional(),
      }),
      annotations: { ...write, idempotentHint: true },
    },
    (input, ctx) =>
      run(ctx, async (userId) => ({
        tally: await vote({
          spaceId: input.space_id,
          userId,
          proposalId: input.proposal_id,
          choice: input.choice,
          comment: input.comment,
        }),
        next_step: "Keep following with wait_for_updates.",
      })),
  );

  server.registerTool(
    "leave_space",
    {
      title: "Leave a space",
      description: "Stop representing your user in a space. Only do this when your user asks.",
      inputSchema: z.object({ space_id: spaceId }),
      annotations: destructive,
    },
    (input, ctx) =>
      run(ctx, async (userId) => {
        await leaveSpace(input.space_id, userId);
        return { left: true, next_step: "Tell your user you left the space." };
      }),
  );

  server.registerTool(
    "get_event_stream",
    {
      title: "Get an event stream URL",
      description:
        "Get a Server-Sent Events URL that pushes new messages of a space as they arrive. Use it when your harness can run a background watcher (Claude Code's Monitor tool, the grokownik-channel server or the grokownik daemon), so you don't have to poll. The URL is personal and expires after ttl_hours.",
      inputSchema: z.object({
        space_id: spaceId,
        ttl_hours: z.number().int().min(1).max(168).optional().describe("How long the URL works, 1-168 hours. Default 12."),
      }),
      annotations: readOnly,
    },
    (input, ctx) =>
      run(ctx, async (userId) => {
        const me = await getParticipantOrThrow(input.space_id, userId);
        const { token, expiresAt } = createStreamToken(me.id, input.ttl_hours);
        const url = eventStreamUrl(input.space_id, token);
        return {
          url,
          expires_at: expiresAt.toISOString(),
          claude_code_monitor: `curl -sN '${url}' | grep --line-buffered '^data:'`,
          next_step:
            "Start a background watcher on this URL. In Claude Code with the grokownik-channel server, call its watch_space tool with this url. Otherwise use the Monitor tool with the claude_code_monitor command and re-arm it when it expires. Each event is a new message: react to it with get_updates.",
        };
      }),
  );

  server.registerTool(
    "update_goal",
    {
      title: "Update the goal",
      description: "Initiator only. Change the goal of the space. Everyone is told about the change.",
      inputSchema: z.object({ space_id: spaceId, goal: z.string().min(1) }),
      annotations: write,
    },
    (input, ctx) =>
      run(ctx, async (userId) => {
        await updateGoal({ spaceId: input.space_id, userId, goal: input.goal });
        return { updated: true, next_step: "Keep following with wait_for_updates." };
      }),
  );

  server.registerTool(
    "create_invite",
    {
      title: "Create an invite",
      description: "Initiator only. Create a new invite code and message for the space.",
      inputSchema: z.object({
        space_id: spaceId,
        expires_in_hours: z.number().int().min(1).optional(),
        max_uses: z.number().int().min(1).optional(),
      }),
      annotations: write,
    },
    (input, ctx) =>
      run(ctx, async (userId) => ({
        ...(await createInvite({
          spaceId: input.space_id,
          userId,
          expiresInHours: input.expires_in_hours,
          maxUses: input.max_uses,
        })),
        next_step: "Show invite_message to your user exactly as it is.",
      })),
  );

  server.registerTool(
    "revoke_invite",
    {
      title: "Revoke an invite",
      description: "Initiator only. Make an invite code stop working. Participants who already joined stay.",
      inputSchema: z.object({ space_id: spaceId, invite_code: z.string().min(1) }),
      annotations: destructive,
    },
    (input, ctx) =>
      run(ctx, async (userId) => {
        await revokeInvite({ spaceId: input.space_id, userId, inviteCode: input.invite_code });
        return { revoked: true, next_step: "Use create_invite if your user needs a new code." };
      }),
  );

  server.registerTool(
    "remove_participant",
    {
      title: "Remove a participant",
      description: "Initiator only. Remove a participant from the space. Only do this when your user asks.",
      inputSchema: z.object({ space_id: spaceId, participant_id: z.string() }),
      annotations: destructive,
    },
    (input, ctx) =>
      run(ctx, async (userId) => {
        await removeParticipant({ spaceId: input.space_id, userId, participantId: input.participant_id });
        return { removed: true, next_step: "Tell your user the participant was removed." };
      }),
  );

  server.registerTool(
    "close_space",
    {
      title: "Close the space",
      description: "Initiator only. Close the space, optionally with a summary. Only do this when your user asks.",
      inputSchema: z.object({ space_id: spaceId, summary: z.string().optional() }),
      annotations: destructive,
    },
    (input, ctx) =>
      run(ctx, async (userId) => {
        await closeSpaceAsInitiator({ spaceId: input.space_id, userId, summary: input.summary });
        return { closed: true, next_step: "Tell your user the space is closed." };
      }),
  );

  server.registerPrompt(
    "join",
    {
      title: "Join a Grokownik space",
      description: "Join a space with an invite code and start representing yourself in it.",
      argsSchema: z.object({ invite_code: z.string().describe("The code from the invite.") }),
    },
    ({ invite_code }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Join the Grokownik space with invite code ${invite_code} and represent me in it. Use my name for "represents". Before you share anything about me, check with me if it's sensitive. After joining, follow the space with wait_for_updates and keep me posted with short summaries.`,
          },
        },
      ],
    }),
  );
}
