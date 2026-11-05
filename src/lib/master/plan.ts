import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  type Criterion,
  type Subproblem,
  type SubproblemStatus,
  spacePlan,
} from "@/db/schema";

// The only module that reads or writes space_plan. Change the storage here
// (e.g. move it into the MCP tables) without touching the Master's tools.

export type Plan = {
  subproblems: Subproblem[];
  constraints: string[];
  criteria: Criterion[];
  finalProposalId: number | null;
};

export async function getPlan(spaceId: string): Promise<Plan> {
  const [row] = await db
    .select()
    .from(spacePlan)
    .where(eq(spacePlan.spaceId, spaceId));
  return {
    subproblems: row?.subproblems ?? [],
    constraints: row?.constraints ?? [],
    criteria: row?.criteria ?? [],
    finalProposalId: row?.finalProposalId ?? null,
  };
}

async function savePlan(spaceId: string, plan: Plan) {
  await db
    .insert(spacePlan)
    .values({ spaceId, ...plan })
    .onConflictDoUpdate({ target: spacePlan.spaceId, set: plan });
  return plan;
}

// Replaces the subproblem list by title. Existing subproblems keep their id,
// status and decision, so reshaping the draft doesn't lose progress.
export async function setSubproblems(spaceId: string, titles: string[]) {
  const plan = await getPlan(spaceId);
  const byTitle = new Map(
    plan.subproblems.map((s) => [s.title.toLowerCase(), s]),
  );
  const subproblems = titles.map(
    (title): Subproblem =>
      byTitle.get(title.toLowerCase()) ?? {
        id: randomUUID(),
        title,
        status: "open",
      },
  );
  return savePlan(spaceId, { ...plan, subproblems });
}

export async function setConstraints(spaceId: string, constraints: string[]) {
  const plan = await getPlan(spaceId);
  return savePlan(spaceId, { ...plan, constraints });
}

export async function updateSubproblem(
  spaceId: string,
  id: string,
  patch: { status?: SubproblemStatus; decision?: string },
) {
  const plan = await getPlan(spaceId);
  const target = plan.subproblems.find((s) => s.id === id);
  if (!target) throw new Error(`Subproblem ${id} not found.`);
  const subproblems = plan.subproblems.map((s) =>
    s.id === id ? { ...s, ...patch } : s,
  );
  await savePlan(spaceId, { ...plan, subproblems });
  return subproblems.find((s) => s.id === id)!;
}

// Replaces the success criteria by text. Existing criteria keep their id and
// progress, so rewording the list doesn't lose what is already met.
export async function setCriteria(spaceId: string, texts: string[]) {
  const plan = await getPlan(spaceId);
  const byText = new Map(plan.criteria.map((c) => [c.text.toLowerCase(), c]));
  const criteria = texts.map(
    (text): Criterion =>
      byText.get(text.toLowerCase()) ?? { id: randomUUID(), text, met: false },
  );
  return savePlan(spaceId, { ...plan, criteria });
}

export async function markCriterion(
  spaceId: string,
  id: string,
  patch: { met: boolean; evidence?: string },
) {
  const plan = await getPlan(spaceId);
  if (!plan.criteria.some((c) => c.id === id)) {
    throw new Error(`Criterion ${id} not found.`);
  }
  const criteria = plan.criteria.map((c) =>
    c.id === id ? { ...c, ...patch } : c,
  );
  await savePlan(spaceId, { ...plan, criteria });
  return criteria.find((c) => c.id === id)!;
}

export function unmetCriteria(plan: Plan) {
  return plan.criteria.filter((c) => !c.met);
}

export async function setFinalProposal(spaceId: string, proposalId: number) {
  const plan = await getPlan(spaceId);
  return savePlan(spaceId, { ...plan, finalProposalId: proposalId });
}
