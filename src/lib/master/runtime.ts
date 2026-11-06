import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { message } from "@/db/schema";
import { type MasterTrigger, onMasterTrigger } from "@/lib/spaces/master-hook";
import { detectBudgetPauses } from "./budget";
import { answeredQuestions } from "./questions";
import { runMasterTurn } from "./turn";
import {
  claimDueWakes,
  completeWakes,
  DEBOUNCE_MS,
  type MasterWake,
  repeatCheck,
  scheduleDebounce,
} from "./wake";

const TICK_MS = 1_000;

// Triggers that don't start a turn on their own. The Master still sees them on
// its next turn, because its cursors cover everything after the last turn.
const QUIET_TRIGGERS: MasterTrigger[] = ["retracted_context"];

// Triggers that can complete the answers to a question.
const ANSWER_TRIGGERS: MasterTrigger[] = ["message", "shared_context"];

async function latestMessageIsPrivate(spaceId: string) {
  const [latest] = await db
    .select({ visibility: message.visibility })
    .from(message)
    .where(eq(message.spaceId, spaceId))
    .orderBy(desc(message.id))
    .limit(1);
  return latest?.visibility === "private";
}

async function onTrigger(spaceId: string, trigger: MasterTrigger) {
  if (QUIET_TRIGGERS.includes(trigger)) return;
  // A private note to the Master doesn't wake it, so it can't react visibly
  // to something meant to stay quiet.
  if (trigger === "message" && (await latestMessageIsPrivate(spaceId))) return;
  const immediate =
    trigger === "created" ||
    trigger === "opened" ||
    (ANSWER_TRIGGERS.includes(trigger) &&
      (await answeredQuestions(spaceId)).length > 0);
  await scheduleDebounce(spaceId, immediate ? 0 : DEBOUNCE_MS);
}

const BUDGET_CHECK_MS = 30_000;
let ticking = false;
let checkingBudgets = false;

async function runWakes(spaceId: string, group: MasterWake[]) {
  try {
    await runMasterTurn(spaceId, group);
    await completeWakes(
      group.filter((wake) => wake.kind !== "check").map((wake) => wake.id),
    );
    // Checks repeat: each one queues its next run.
    for (const wake of group.filter((w) => w.kind === "check")) {
      await repeatCheck(wake);
    }
  } catch (error) {
    // Left claimed: claimDueWakes picks it up again after its timeout.
    console.error(`Master turn failed for space ${spaceId}`, error);
  }
}

// Runs apart from the wake ticker: fetching every session's snapshot is slow
// and must not delay turns.
async function checkBudgets() {
  if (checkingBudgets) return;
  checkingBudgets = true;
  try {
    await detectBudgetPauses();
  } catch (error) {
    console.error("Master budget check failed", error);
  } finally {
    checkingBudgets = false;
  }
}

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    const wakes = await claimDueWakes();
    const bySpace = new Map<string, MasterWake[]>();
    for (const wake of wakes) {
      bySpace.set(wake.spaceId, [...(bySpace.get(wake.spaceId) ?? []), wake]);
    }
    await Promise.all(
      [...bySpace].map(([spaceId, group]) => runWakes(spaceId, group)),
    );
  } catch (error) {
    console.error("Master tick failed", error);
  } finally {
    ticking = false;
  }
}

const store = globalThis as typeof globalThis & {
  __masterTicker?: NodeJS.Timeout;
  __masterBudgetTicker?: NodeJS.Timeout;
};

// Called once per server from src/instrumentation.ts.
export function startMaster() {
  onMasterTrigger(onTrigger);
  if (store.__masterTicker) return;
  store.__masterTicker = setInterval(() => void tick(), TICK_MS);
  store.__masterBudgetTicker = setInterval(
    () => void checkBudgets(),
    BUDGET_CHECK_MS,
  );
  console.log("Master agent: listening for space events");
}
