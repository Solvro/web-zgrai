export type MasterTrigger =
  | "created"
  | "opened"
  | "joined"
  | "message"
  | "shared_context"
  | "retracted_context"
  | "vote"
  | "left"
  | "goal_updated";

type Listener = (
  spaceId: string,
  trigger: MasterTrigger,
) => void | Promise<void>;

// Kept on globalThis: Next.js can load instrumentation.ts (where the listener
// is registered) and the route handlers (which call notifyMaster) as separate
// module instances, so a module-level variable wouldn't be shared.
const store = globalThis as typeof globalThis & { __masterListener?: Listener | null };

export function onMasterTrigger(next: Listener) {
  store.__masterListener = next;
}

export function notifyMaster(spaceId: string, trigger: MasterTrigger) {
  const listener = store.__masterListener;
  if (!listener) return;
  Promise.resolve(listener(spaceId, trigger)).catch((error) => {
    console.error("Master trigger failed", error);
  });
}
