import type { SessionView } from "@/lib/dashboard/view";
import { auth } from "@/lib/auth";
import { getSessionView } from "@/lib/spaces/dashboard";
import { SpaceError } from "@/lib/spaces/service";

const TICK_MS = 1000;
const PING_MS = 15_000;

// Everything but the messages, to tell whether presence, steps or criteria
// changed since the last event.
function stateKey(view: SessionView) {
  const { space, me, people, steps, criteria, finalPlan } = view;
  return JSON.stringify([space, me, people, steps, criteria, finalPlan]);
}

function startCursor(request: Request) {
  const raw =
    request.headers.get("last-event-id") ??
    new URL(request.url).searchParams.get("after");
  const value = Number(raw ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

// The live session for the dashboard as Server-Sent Events: a `view` event
// with whatever changed, `ping` every 15 seconds, and `closed` once the space
// is closed. The event id is the message cursor, so a reconnect resumes.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { spaceId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });
  const userId = session.user.id;

  let first: SessionView | null;
  try {
    first = await getSessionView(spaceId, userId, startCursor(request));
  } catch (error) {
    if (error instanceof SpaceError)
      return new Response(error.message, { status: 404 });
    throw error;
  }
  if (!first) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown, id?: number) => {
        if (request.signal.aborted) return;
        const head = id == null ? "" : `id: ${id}\n`;
        controller.enqueue(
          encoder.encode(
            `${head}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
          ),
        );
      };

      let view = first;
      let cursor = view.cursor;
      let lastState = stateKey(view);
      let lastSent = Date.now();
      controller.enqueue(encoder.encode("retry: 3000\n\n"));
      send("view", view, cursor);

      while (!request.signal.aborted && view.space.status !== "closed") {
        await new Promise((resolve) => setTimeout(resolve, TICK_MS));
        if (request.signal.aborted) break;
        try {
          const next = await getSessionView(spaceId, userId, cursor);
          if (!next) break;
          view = next;
          const state = stateKey(view);
          if (view.messages.length > 0 || state !== lastState) {
            cursor = view.cursor;
            lastState = state;
            lastSent = Date.now();
            send("view", view, cursor);
          } else if (Date.now() - lastSent > PING_MS) {
            lastSent = Date.now();
            send("ping", {});
          }
        } catch (error) {
          console.error("Dashboard stream failed", error);
          break;
        }
      }
      if (view.space.status === "closed") send("closed", {});
      try {
        controller.close();
      } catch {}
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
