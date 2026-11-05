import type { ScenarioContext, ScenarioStep } from "./simulation";
import type { Space } from "./types";

function step(wait: number, run: (ctx: ScenarioContext) => void): ScenarioStep {
  return { wait, run };
}

const TRIP_ACCOMMODATION = [
  "Apartment in Le Marais, €38/night",
  "Hostel near Gare du Nord, €24/night",
  "Two flats in Montmartre, €31/night",
];

// The example from CONCEPT.md, played out end to end.
export const TRIP_SUBPROBLEMS = ["Destination", "Dates", "Accommodation", "Transport"];

// How many steps of the trip are already in the history when the dashboard
// loads: everyone has answered about the destination and the conflict is on.
export const TRIP_PREPLAY = 14;

export const tripScenario: ScenarioStep[] = [
  step(0, (ctx) => {
    ctx.system("Ola opened the space", "create_space");
    ctx.master.post("Shared the goal and the plan", {
      content:
        "Hi! We're planning the May trip. Goal: decide where and when we go, where we sleep and how we get there. I'll go through destination, dates, accommodation and transport, one by one.",
    });
  }),
  step(3000, (ctx) =>
    ctx.join("ola", {
      name: "Ola",
      harness: "Claude Code",
      role: "initiator",
      intro: "Ola is the organiser. She prefers warm places and short travel.",
    }),
  ),
  step(4000, (ctx) =>
    ctx.join("dawid", {
      name: "Dawid",
      harness: "Claude Code",
      intro: "Dawid is free most of May.",
    }),
  ),
  step(2500, (ctx) =>
    ctx.master.ask("Where would you like to go? Anything you'd rather avoid?", {
      subproblem: "Destination",
      ref: "q-dest",
      deadlineMs: 180_000,
      content:
        "First up: the destination. Tell me where your person would like to go and where they'd rather not. Short reasons help me find a compromise.",
    }),
  ),
  step(3500, (ctx) =>
    ctx.join("maciek", {
      name: "Maciek",
      harness: "ChatGPT",
      intro: "Maciek loves hiking.",
    }),
  ),
  step(3000, (ctx) =>
    ctx.say("ola", "Austria or northern Italy: mountains or a lake", {
      replyTo: "q-dest",
      content:
        "Ola would like Austria or northern Italy. Mountains or a lake, ideally both. Not a big city.",
    }),
  ),
  step(4000, (ctx) =>
    ctx.share("dawid", "travel history", "Has been to Czechia twice, wants somewhere new", {
      replyTo: "q-dest",
      content:
        "From Dawid's notes: Prague in 2024, Brno in 2025. He'd rather go somewhere new. Austria is fine.",
    }),
  ),
  step(3000, (ctx) =>
    ctx.join("jan", {
      name: "Jan",
      harness: "Grok",
      intro: "Jan checks his calendar on the go.",
    }),
  ),
  step(3500, (ctx) =>
    ctx.say("maciek", "Austria: wants a hiking day in the Alps", {
      replyTo: "q-dest",
      content: "Maciek votes for Austria. He'd like at least one full day of hiking.",
    }),
  ),
  step(3000, (ctx) => ctx.join("zosia", { name: "Zosia", harness: "Cursor" })),
  step(3500, (ctx) =>
    ctx.say("jan", "Austria works for Jan", { replyTo: "q-dest" }),
  ),
  step(4000, (ctx) =>
    ctx.say("zosia", "Strongly against Austria: she was there last month", {
      replyTo: "q-dest",
      content:
        "Zosia was in Vienna and Salzburg in April and really doesn't want Austria again. She'd prefer a city trip with museums.",
    }),
  ),
  step(1500, (ctx) => {
    ctx.master.status("Destination", "conflict");
    ctx.master.note(
      "What we know",
      "- 6 people, 4-5 days in May\n- Dawid: anything but Czechia\n- Ola, Maciek, Jan: Austria\n- Zosia: strongly against Austria, wants a city trip",
    );
    ctx.master.note("Open conflicts", "- Destination: 3 for Austria, Zosia strongly against");
    ctx.master.note("Still missing", "- Destination\n- Dates\n- Accommodation\n- Transport");
  }),
  step(3000, (ctx) => ctx.join("kuba", { name: "Kuba", harness: "ChatGPT" })),
  // Live from here on.
  step(1000, (ctx) => {
    ctx.silent("kuba", true);
    ctx.master.thinking();
  }),
  step(4500, (ctx) =>
    ctx.master.propose(
      "3 want Austria, Zosia is strongly against. How about Paris?",
      ["Yes", "No"],
      {
        subproblem: "Destination",
        ref: "p-paris",
        content:
          "Austria has a majority, but Zosia was there last month. Paris is new for everyone, has the museums Zosia wants, and Fontainebleau forest is a day of hiking for Maciek.",
      },
    ),
  ),
  step(3000, (ctx) => ctx.vote("zosia", "p-paris", "Yes", "museums!")),
  step(2500, (ctx) => ctx.vote("ola", "p-paris", "Yes")),
  step(3000, (ctx) => ctx.vote("maciek", "p-paris", "No", "not enough mountains")),
  step(2500, (ctx) =>
    ctx.say("maciek", "Budget limit for accommodation", {
      private: true,
      content: "Maciek's budget is tight: max 900 PLN for accommodation in total.",
    }),
  ),
  step(3000, (ctx) => ctx.vote("dawid", "p-paris", "Yes")),
  step(2500, (ctx) => ctx.vote("jan", "p-paris", "Yes", "fine by me")),
  step(2000, (ctx) => ctx.master.thinking()),
  step(3500, (ctx) => {
    ctx.master.decide("Destination: Paris, 4 of 5 votes. Maciek gets a hiking day", {
      subproblem: "Destination",
      decision: "Paris, with a hiking day in Fontainebleau",
      replyTo: "p-paris",
      content:
        "4 of 5 votes for Paris. To meet Maciek halfway, one day is a hike in Fontainebleau forest.",
    });
    ctx.master.note(
      "What we know",
      "- 6 people, 4-5 days in May\n- Destination: Paris\n- One hiking day in Fontainebleau for Maciek",
    );
    ctx.master.note("Open conflicts", "- None right now");
    ctx.master.note("Still missing", "- Dates\n- Accommodation\n- Transport");
  }),
  step(3000, (ctx) =>
    ctx.master.ask("Which days in May work? Please share calendar availability.", {
      subproblem: "Dates",
      ref: "q-dates",
      deadlineMs: 120_000,
    }),
  ),
  step(3500, (ctx) =>
    ctx.share("ola", "availability", "Free 8-11 May and 14-24 May", { replyTo: "q-dates" }),
  ),
  step(3000, (ctx) =>
    ctx.share("jan", "availability", "Free after 13 May", { replyTo: "q-dates" }),
  ),
  step(2500, (ctx) =>
    ctx.share("dawid", "availability", "Free all of May except 20-22", { replyTo: "q-dates" }),
  ),
  step(3000, (ctx) =>
    ctx.share("zosia", "availability", "Free 14-18 May only", { replyTo: "q-dates" }),
  ),
  step(3000, (ctx) =>
    ctx.share("maciek", "availability", "Free 12-31 May", { replyTo: "q-dates" }),
  ),
  step(2500, (ctx) =>
    ctx.master.ask("Kuba, we haven't heard from you. Any days in May that don't work?", {
      to: ["kuba"],
      ref: "q-kuba",
      deadlineMs: 60_000,
      subproblem: "Dates",
    }),
  ),
  step(9000, (ctx) =>
    ctx.master.post("No answer from Kuba yet. Going on with 14-18 May; Kuba can still object."),
  ),
  step(2000, (ctx) => {
    ctx.master.decide("Dates: 14-18 May, the only window that works for everyone who answered", {
      subproblem: "Dates",
      decision: "14-18 May (4 nights)",
      replyTo: "q-dates",
    });
    ctx.master.note(
      "What we know",
      "- 6 people\n- Destination: Paris, with a hiking day\n- Dates: 14-18 May",
    );
    ctx.master.note(
      "Still missing",
      "- Kuba's availability (no answer yet)\n- Accommodation\n- Transport",
    );
  }),
  step(3000, (ctx) => {
    ctx.master.status("Accommodation", "discussing");
    ctx.master.propose("Accommodation: three options in Paris for 14-18 May", TRIP_ACCOMMODATION, {
      subproblem: "Accommodation",
      ref: "p-stay",
      content: "Prices are per person per night. Vote for the one your person prefers.",
    });
  }),
  step(3500, (ctx) => ctx.say("dawid", "Le Marais is too expensive", { replyTo: "p-stay" })),
  step(3000, (ctx) =>
    ctx.say("ola", "Wants breakfast included, or at least a kitchen", { replyTo: "p-stay" }),
  ),
  step(2500, (ctx) => ctx.vote("zosia", "p-stay", TRIP_ACCOMMODATION[2], "close to museums")),
  step(2500, (ctx) => ctx.vote("ola", "p-stay", TRIP_ACCOMMODATION[2])),
  step(3000, (ctx) => ctx.vote("dawid", "p-stay", TRIP_ACCOMMODATION[1])),
  step(2500, (ctx) => ctx.vote("jan", "p-stay", TRIP_ACCOMMODATION[2])),
  step(3000, (ctx) => ctx.vote("maciek", "p-stay", TRIP_ACCOMMODATION[1])),
  step(2500, (ctx) => {
    ctx.silent("kuba", false);
    ctx.say("kuba", "Back online: 14-18 May works, happy with Paris", {
      replyTo: "q-kuba",
      content: "Sorry, Kuba was offline for a while. 14-18 May works for him and he's happy with Paris.",
    });
  }),
  step(2500, (ctx) => ctx.vote("kuba", "p-stay", TRIP_ACCOMMODATION[2])),
  step(2000, (ctx) => ctx.master.thinking()),
  step(3500, (ctx) => {
    ctx.master.decide("Accommodation: two flats in Montmartre, 4 of 6 votes", {
      subproblem: "Accommodation",
      decision: "Two flats in Montmartre, €31/night, with kitchens",
      replyTo: "p-stay",
      content:
        "Fits everyone's budget, including the private limits I was given. The kitchens cover Ola's breakfast wish.",
    });
    ctx.master.note("Still missing", "- Transport");
  }),
  step(3000, (ctx) =>
    ctx.master.ask("Last one: plane or train? Everyone leaves from Wrocław.", {
      subproblem: "Transport",
      ref: "q-transport",
      deadlineMs: 90_000,
    }),
  ),
  step(3000, (ctx) =>
    ctx.say("jan", "Plane, the train takes 14 hours", { replyTo: "q-transport" }),
  ),
  step(2500, (ctx) =>
    ctx.say("maciek", "Plane, if it's under 600 PLN return", { replyTo: "q-transport" }),
  ),
  step(2500, (ctx) => ctx.say("zosia", "Plane", { replyTo: "q-transport" })),
  step(2000, (ctx) =>
    ctx.share("ola", "flights", "Found WRO → Beauvais on 14 May, 480 PLN return", {
      replyTo: "q-transport",
      content: "WRO → Beauvais, 14 May 06:40, back on 18 May 21:10. 480 PLN return with a small bag.",
    }),
  ),
  step(3000, (ctx) => ctx.say("dawid", "Plane is fine", { replyTo: "q-transport" })),
  step(2500, (ctx) => ctx.say("kuba", "Plane, fine by Kuba", { replyTo: "q-transport" })),
  step(3000, (ctx) => {
    ctx.master.decide("Transport: flight WRO → Beauvais, 480 PLN return", {
      subproblem: "Transport",
      decision: "Flight WRO → Beauvais, 14 May, back 18 May",
      replyTo: "q-transport",
    });
    ctx.master.note(
      "What we know",
      "- Paris, 14-18 May, hiking day in Fontainebleau\n- Two flats in Montmartre\n- Flight WRO → Beauvais",
    );
    ctx.master.note("Still missing", "- Nothing. Everyone books their own flight.");
  }),
  step(4000, (ctx) =>
    ctx.master.close(
      "Paris, 14-18 May. Two flats in Montmartre with kitchens (€31/night). Flight WRO → Beauvais on 14 May, back on 18 May (480 PLN return). A hiking day in Fontainebleau for Maciek. Next: everyone books their own flight by Friday, Ola books both flats.",
    ),
  ),
];

const SIMULATED_PEOPLE = [
  { key: "ala", name: "Ala", harness: "ChatGPT" },
  { key: "bartek", name: "Bartek", harness: "Claude Code" },
  { key: "celina", name: "Celina", harness: "Grok" },
  { key: "darek", name: "Darek", harness: "Cursor" },
];

function bullets(lines: string[]) {
  return lines.length ? lines.map((line) => `- ${line}`).join("\n") : "- Nothing yet";
}

// For spaces created on the dashboard: the friends' agents join one by one
// and the Master walks through the subproblems from the draft. The answers
// are placeholders; the point is to exercise every part of the live view.
export function genericScenario(space: Space): ScenarioStep[] {
  const titles = space.subproblems.map((s) => s.title);
  const everyone = ["me", ...SIMULATED_PEOPLE.map((p) => p.key)];
  const steps: ScenarioStep[] = [
    step(1500, (ctx) =>
      ctx.master.post("Shared the goal and the plan", {
        content: `Hi! Goal: ${space.goal} I'll go through: ${titles.join(", ")}.`,
      }),
    ),
    step(4000, (ctx) =>
      ctx.join("me", {
        name: space.initiatorName,
        harness: "Claude Code",
        role: "initiator",
      }),
    ),
    ...SIMULATED_PEOPLE.map((person, i) =>
      step(4000 + i * 1500, (ctx) =>
        ctx.join(person.key, { name: person.name, harness: person.harness }),
      ),
    ),
  ];

  titles.forEach((title, i) => {
    const question = `q-${i}`;
    const proposal = `p-${i}`;
    const topic = title.toLowerCase();
    steps.push(
      step(3000, (ctx) =>
        ctx.master.ask(`What does your person think about ${topic}?`, {
          subproblem: title,
          ref: question,
          deadlineMs: 120_000,
        }),
      ),
    );
    everyone.forEach((key, j) => {
      const option = j % 3 === 2 ? "B" : "A";
      steps.push(
        step(2500 + (j % 2) * 1000, (ctx) =>
          j === 1
            ? ctx.share(key, topic, `Shared notes about ${topic}`, {
                replyTo: question,
                content: `Notes about ${topic} from the user's files (simulated).`,
              })
            : ctx.say(key, `Leans towards option ${option} for ${topic}`, {
                replyTo: question,
              }),
        ),
      );
    });
    steps.push(
      step(1500, (ctx) => {
        if (i === 1) {
          ctx.master.status(title, "conflict");
          ctx.master.note("Open conflicts", `- ${title}: option A vs option B`);
        }
        ctx.master.thinking();
      }),
    );
    steps.push(
      step(3000, (ctx) =>
        ctx.master.propose(`${title}: most lean towards option A. Go with it?`, ["Yes", "No"], {
          subproblem: title,
          ref: proposal,
        }),
      ),
    );
    everyone.forEach((key, j) => {
      steps.push(step(2000, (ctx) => ctx.vote(key, proposal, j % 3 === 2 ? "No" : "Yes")));
    });
    steps.push(
      step(2500, (ctx) => {
        ctx.master.decide(`${title}: option A`, {
          subproblem: title,
          decision: "Option A",
          replyTo: proposal,
        });
        ctx.master.note("What we know", bullets(titles.slice(0, i + 1).map((t) => `${t}: option A`)));
        ctx.master.note("Still missing", bullets(titles.slice(i + 1)));
        if (i === 1) ctx.master.note("Open conflicts", "- None right now");
      }),
    );
  });

  steps.push(
    step(4000, (ctx) =>
      ctx.master.close(`Decided: ${titles.map((t) => `${t}: option A`).join("; ")}.`),
    ),
  );
  return steps;
}
