import { auth } from "@/lib/auth";
import {
  getActiveParticipant,
  getParticipantById,
  getSpaceOrThrow,
  latestMessageId,
  peekMessages,
  type Participant,
  SpaceError,
  truncate,
} from "@/lib/spaces/service";
import { verifyStreamToken } from "@/lib/spaces/stream-token";

const POLL_MS = 1000;
const HEARTBEAT_MS = 15_000;

async function resolveParticipant(request: Request, spaceId: string) {
  const token = new URL(request.url).searchParams.get("token");
  if (token) {
    const participantId = verifyStreamToken(token);
    if (!participantId) return null;
    const me = await getParticipantById(participantId);
    return me && me.spaceId === spaceId ? me : null;
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  return getActiveParticipant(spaceId, session.user.id);
}

function initialCursor(request: Request) {
  const raw =
    request.headers.get("last-event-id") ??
    new URL(request.url).searchParams.get("cursor");
  const value = raw == null ? NaN : Number(raw);
  return Number.isFinite(value) ? value : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { spaceId } = await params;
  let me: Participant | null;
  try {
    await getSpaceOrThrow(spaceId);
    me = await resolveParticipant(request, spaceId);
  } catch (error) {
    if (error instanceof SpaceError)
      return new Response(error.message, { status: 404 });
    throw error;
  }
  if (!me) return new Response("Unauthorized", { status: 401 });

  const participant = me;
  let cursor = initialCursor(request) ?? (await latestMessageId(spaceId));
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      let lastBeat = Date.now();
      send(`retry: 3000\n: connected, cursor ${cursor}\n\n`);

      while (!request.signal.aborted) {
        try {
          const space = await getSpaceOrThrow(spaceId);
          const messages = await peekMessages(participant, cursor);
          for (const m of messages) {
            const data = {
              id: m.id,
              kind: m.kind,
              from: m.from,
              text: truncate(m.text, 200),
              reply_to: m.reply_to,
              addressed_to_you: m.addressed_to_you,
            };
            send(
              `id: ${m.id}\nevent: message\ndata: ${JSON.stringify(data)}\n\n`,
            );
            cursor = m.id;
          }
          if (space.status === "closed") {
            send(
              `event: closed\ndata: ${JSON.stringify({ space_id: spaceId, status: "closed" })}\n\n`,
            );
            break;
          }
          if (Date.now() - lastBeat > HEARTBEAT_MS) {
            send(": ping\n\n");
            lastBeat = Date.now();
          }
        } catch (error) {
          console.error("Event stream failed", error);
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
