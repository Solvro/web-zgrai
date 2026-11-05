import { newSpace, shapeNow } from "./actions";
import {
  TRIP_PREPLAY,
  TRIP_SUBPROBLEMS,
  genericScenario,
  tripScenario,
} from "./scenarios";
import { SUBPROBLEM_TEMPLATES } from "./shaping";
import { startScenario } from "./simulation";
import { insertSpace, makeId, now } from "./store";
import type { Subproblem } from "./types";

function subproblems(titles: string[]): Subproblem[] {
  return titles.map((title) => ({ id: makeId("sub"), title, status: "open" }));
}

const MINUTE = 60_000;

let seeded = false;

// Three spaces, one per state: closed, draft and live.
export function ensureSeeded() {
  if (seeded) return;
  seeded = true;

  const closedAt = now() - 26 * 60 * MINUTE;
  const project = newSpace({
    title: "Team project: split the work",
    goal: "Agree on the scope and split the work, so everyone knows what to do and by when.",
    description: "Course project for the software engineering class.",
    status: "open",
    inviteCode: "TPR-4KM",
    inviteStepDone: true,
    subproblems: subproblems(SUBPROBLEM_TEMPLATES.project),
    constraints: ["5 people", "Demo on 15 January"],
    createdAt: closedAt - 40 * MINUTE,
    openedAt: closedAt - 35 * MINUTE,
  });
  insertSpace(project);
  startScenario(project.id, genericScenario(project), {
    preplay: Number.POSITIVE_INFINITY,
    endAt: closedAt,
  });

  const draft = newSpace({ createdAt: now() - 20 * MINUTE });
  insertSpace(draft);
  shapeNow(
    draft.id,
    "We need to design a survey for our research on how students use AI assistants.",
  );
  shapeNow(draft.id, "4 of us from the research group, plus our supervisor.");

  const trip = newSpace({
    title: "May trip 2027",
    goal: "Decide where and when we go, where we sleep and how we get there.",
    description: "A trip for our group of friends after the semester.",
    status: "open",
    inviteCode: "K7P-3QX",
    inviteStepDone: true,
    subproblems: subproblems(TRIP_SUBPROBLEMS),
    constraints: ["6 people, 4-5 days in May", "Somewhere new for everyone", "Leaving from Wrocław"],
    createdAt: now() - 5 * MINUTE,
    openedAt: now() - 3 * MINUTE,
  });
  insertSpace(trip);
  startScenario(trip.id, tripScenario, { preplay: TRIP_PREPLAY });
}
