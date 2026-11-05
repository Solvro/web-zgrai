import {
  bigserial,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  bigint,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const spaceStatus = pgEnum("space_status", ["draft", "open", "closed"]);
export const participantRole = pgEnum("participant_role", [
  "initiator",
  "member",
]);
export const messageKind = pgEnum("message_kind", [
  "message",
  "question",
  "proposal",
  "decision",
  "system",
]);
export const messageVisibility = pgEnum("message_visibility", [
  "all",
  "private",
]);
export const voteChoice = pgEnum("vote_choice", ["yes", "no", "abstain"]);
export const activityType = pgEnum("activity_type", [
  "created",
  "joined",
  "message",
  "shared_context",
  "retracted_context",
  "vote",
  "left",
  "removed",
  "goal_updated",
  "closed",
]);
export const boardItemKind = pgEnum("board_item_kind", ["note", "pin"]);

export const space = pgTable("space", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  goal: text("goal").notNull(),
  description: text("description"),
  deadline: timestamp("deadline"),
  status: spaceStatus("status").default("open").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

export const spaceInvite = pgTable(
  "space_invite",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull().unique(),
    expiresAt: timestamp("expires_at"),
    maxUses: integer("max_uses"),
    uses: integer("uses").default(0).notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("space_invite_space_idx").on(table.spaceId)],
);

export const participant = pgTable(
  "participant",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    represents: text("represents").notNull(),
    role: participantRole("role").default("member").notNull(),
    harness: text("harness"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
    leftAt: timestamp("left_at"),
    lastReadMessageId: bigint("last_read_message_id", { mode: "number" }),
  },
  (table) => [
    uniqueIndex("participant_space_user_idx").on(table.spaceId, table.userId),
    index("participant_user_idx").on(table.userId),
  ],
);

export const message = pgTable(
  "message",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    authorParticipantId: text("author_participant_id").references(
      () => participant.id,
      { onDelete: "set null" },
    ),
    kind: messageKind("kind").default("message").notNull(),
    replyTo: bigint("reply_to", { mode: "number" }),
    visibility: messageVisibility("visibility").default("all").notNull(),
    addressedTo: text("addressed_to").array(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("message_space_id_idx").on(table.spaceId, table.id)],
);

export const boxItem = pgTable(
  "box_item",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participant.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    retractedAt: timestamp("retracted_at"),
  },
  (table) => [index("box_item_participant_idx").on(table.participantId)],
);

export const proposalVote = pgTable(
  "proposal_vote",
  {
    proposalMessageId: bigint("proposal_message_id", { mode: "number" })
      .notNull()
      .references(() => message.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participant.id, { onDelete: "cascade" }),
    choice: voteChoice("choice").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.proposalMessageId, table.participantId] }),
  ],
);

export const activity = pgTable(
  "activity",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    actorParticipantId: text("actor_participant_id").references(
      () => participant.id,
      { onDelete: "set null" },
    ),
    type: activityType("type").notNull(),
    refId: text("ref_id"),
    visibility: messageVisibility("visibility").default("all").notNull(),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("activity_space_id_idx").on(table.spaceId, table.id)],
);

export const boardItem = pgTable(
  "board_item",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    kind: boardItemKind("kind").notNull(),
    title: text("title"),
    content: text("content").notNull(),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    removedAt: timestamp("removed_at"),
  },
  (table) => [index("board_item_space_idx").on(table.spaceId)],
);
