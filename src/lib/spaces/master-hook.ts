export type MasterTrigger =
  | "created"
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

let listener: Listener | null = null;

export function onMasterTrigger(next: Listener) {
  listener = next;
}

export function notifyMaster(spaceId: string, trigger: MasterTrigger) {
  if (!listener) return;
  Promise.resolve(listener(spaceId, trigger)).catch((error) => {
    console.error("Master trigger failed", error);
  });
}
