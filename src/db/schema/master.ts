import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { space } from "./spaces";

// Tables owned by the Master agent (eve). The MCP tables in ./spaces stay
// untouched, so this side can change without migrating theirs.

// One eve session per space. `lastMessageId` and `lastActivityId` are the
// Master's cursors: every message and activity after them is "new" in the
// next turn (activity covers events that aren't messages, like votes).
export const masterSession = pgTable("master_session", {
  spaceId: text("space_id")
    .primaryKey()
    .references(() => space.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull().unique(),
  lastMessageId: bigint("last_message_id", { mode: "number" })
    .default(0)
    .notNull(),
  lastActivityId: bigint("last_activity_id", { mode: "number" })
    .default(0)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  // Set while eve holds the session at its token budget, until the initiator
  // decides to continue. `budgetInteractionId` is the prompt to answer.
  pausedAt: timestamp("paused_at"),
  budgetInteractionId: text("budget_interaction_id"),
});

export const masterWakeKind = pgEnum("master_wake_kind", [
  "debounce",
  "deadline",
  "check",
]);

// Pending Master turns. A `debounce` row batches events for a few seconds; a
// `deadline` row fires when a question's answer time runs out; a `check` row is
// a check-in the Master scheduled for itself, repeated every
// `intervalMinutes`. The ticker in src/lib/master/runtime.ts claims due rows,
// so nothing is lost on restart.
export const masterWake = pgTable(
  "master_wake",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    kind: masterWakeKind("kind").notNull(),
    dueAt: timestamp("due_at").notNull(),
    // For `deadline`: the question message the deadline belongs to.
    refMessageId: bigint("ref_message_id", { mode: "number" }),
    // For `check`: how often it repeats, and why the Master scheduled it.
    intervalMinutes: integer("interval_minutes"),
    reason: text("reason"),
    claimedAt: timestamp("claimed_at"),
    doneAt: timestamp("done_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("master_wake_due_idx").on(table.doneAt, table.dueAt),
    // At most one unclaimed debounce per space: later events join that batch.
    // A claimed row being processed doesn't block the next batch.
    uniqueIndex("master_wake_pending_debounce_idx")
      .on(table.spaceId)
      .where(
        sql`${table.kind} = 'debounce' and ${table.claimedAt} is null and ${table.doneAt} is null`,
      ),
    // At most one active check per space. Only checks have an interval; the
    // predicate avoids the enum, because Postgres can't use a new enum value
    // in the migration that adds it.
    uniqueIndex("master_wake_active_check_idx")
      .on(table.spaceId)
      .where(
        sql`${table.intervalMinutes} is not null and ${table.doneAt} is null`,
      ),
  ],
);

export type SubproblemStatus = "open" | "discussing" | "conflict" | "decided";

export type Subproblem = {
  id: string;
  title: string;
  status: SubproblemStatus;
  decision?: string;
};

// A success criterion for the whole task. The space can only end once every
// criterion is met.
export type Criterion = {
  id: string;
  text: string;
  met: boolean;
  evidence?: string;
};

// The shaped problem: subproblems and constraints, written by the Master in
// stage 1 and kept up to date while the space runs. Same shape the dashboard
// uses, so the mock store can be swapped for it.
export const spacePlan = pgTable("space_plan", {
  spaceId: text("space_id")
    .primaryKey()
    .references(() => space.id, { onDelete: "cascade" }),
  subproblems: jsonb("subproblems").$type<Subproblem[]>().default([]).notNull(),
  constraints: jsonb("constraints").$type<string[]>().default([]).notNull(),
  criteria: jsonb("criteria").$type<Criterion[]>().default([]).notNull(),
  // The final plan put to everyone's vote once all criteria are met. The space
  // ends when every active participant votes yes on it.
  finalProposalId: bigint("final_proposal_id", { mode: "number" }),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
