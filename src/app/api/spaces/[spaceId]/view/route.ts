import { auth } from "@/lib/auth";
import { getSessionView } from "@/lib/spaces/dashboard";
import { SpaceError } from "@/lib/spaces/service";

// The dashboard polls this for the live session.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { spaceId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });
  const after = Number(new URL(request.url).searchParams.get("after") ?? 0);
  try {
    const view = await getSessionView(
      spaceId,
      session.user.id,
      Number.isFinite(after) ? after : 0,
    );
    if (!view) return new Response("Not found", { status: 404 });
    return Response.json(view, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SpaceError)
      return new Response(error.message, { status: 404 });
    throw error;
  }
}
