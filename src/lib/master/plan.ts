import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { type Subproblem, type SubproblemStatus, spacePlan } from "@/db/schema";

// The only module that reads or writes space_plan. Change the storage here
// (e.g. move it into the MCP tables) without touching the Master's tools.

export type Plan = { subproblems: Subproblem[]; constraints: string[] };

export async function getPlan(spaceId: string): Promise<Plan> {
  const [row] = await db
    .select()
    .from(spacePlan)
    .where(eq(spacePlan.spaceId, spaceId));
  return {
    subproblems: row?.subproblems ?? [],
    constraints: row?.constraints ?? [],
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
