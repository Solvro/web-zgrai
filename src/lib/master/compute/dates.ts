const DAY_MS = 86_400_000;
const MAX_DAYS = 400;
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export type DateRange = { from: string; to: string };

export type Availability = {
  id: string;
  available?: DateRange[];
  unavailable?: DateRange[];
};

export function parseDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`"${value}" isn't a date in YYYY-MM-DD form.`);
  }
  const day = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== value) {
    throw new Error(`"${value}" isn't a real date.`);
  }
  return day.getTime();
}

const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const weekday = (time: number) => WEEKDAYS[new Date(time).getUTCDay()];

function daysOf(range: DateRange) {
  const from = parseDay(range.from);
  const to = parseDay(range.to);
  if (to < from) throw new Error(`${range.to} is before ${range.from}.`);
  const count = (to - from) / DAY_MS + 1;
  if (count > MAX_DAYS)
    throw new Error(`Ranges are limited to ${MAX_DAYS} days.`);
  return Array.from({ length: count }, (_, i) => from + i * DAY_MS);
}

function within(ranges: DateRange[], day: number) {
  return ranges.some((r) => day >= parseDay(r.from) && day <= parseDay(r.to));
}

export function dateInfo(range: { from: string; to?: string }) {
  const days = daysOf({ from: range.from, to: range.to ?? range.from });
  const weekend = days.filter((d) => [0, 6].includes(new Date(d).getUTCDay()));
  return {
    from: { date: iso(days[0]), weekday: weekday(days[0]) },
    to: { date: iso(days.at(-1)!), weekday: weekday(days.at(-1)!) },
    days: days.length,
    nights: days.length - 1,
    weekend_days: weekend.length,
    working_days: days.length - weekend.length,
  };
}

// Day-by-day availability over a window: who is free on each day, the runs of
// at least `minDays` when everyone is free, and otherwise the windows of
// `minDays` that the most people can make.
export function findCommonDates(input: {
  window: DateRange;
  minDays: number;
  participants: Availability[];
  top?: number;
}) {
  const days = daysOf(input.window);
  for (const p of input.participants) {
    for (const r of [...(p.available ?? []), ...(p.unavailable ?? [])]) {
      if (parseDay(r.to) < parseDay(r.from)) {
        throw new Error(`${p.id}: ${r.to} is before ${r.from}.`);
      }
    }
  }
  const free = days.map(
    (day) =>
      new Set(
        input.participants
          .filter(
            (p) =>
              (!p.available?.length || within(p.available, day)) &&
              !within(p.unavailable ?? [], day),
          )
          .map((p) => p.id),
      ),
  );
  const everyone = input.participants.length;

  const runs: { from: string; to: string; days: number }[] = [];
  let start = -1;
  for (let i = 0; i <= days.length; i++) {
    const allFree = i < days.length && free[i].size === everyone;
    if (allFree && start < 0) start = i;
    if (!allFree && start >= 0) {
      if (i - start >= input.minDays) {
        runs.push({
          from: iso(days[start]),
          to: iso(days[i - 1]),
          days: i - start,
        });
      }
      start = -1;
    }
  }

  const windows = [];
  for (let i = 0; i + input.minDays <= days.length; i++) {
    const span = free.slice(i, i + input.minDays);
    const ids = input.participants
      .map((p) => p.id)
      .filter((id) => span.every((day) => day.has(id)));
    windows.push({ start: i, ids });
  }
  windows.sort((a, b) => b.ids.length - a.ids.length || a.start - b.start);
  const best: typeof windows = [];
  for (const w of windows) {
    if (best.length >= (input.top ?? 5)) break;
    if (best.some((b) => Math.abs(b.start - w.start) < input.minDays)) continue;
    best.push(w);
  }

  return {
    everyone_free: runs,
    best_windows: best.map((w) => ({
      from: iso(days[w.start]),
      to: iso(days[w.start + input.minDays - 1]),
      free: w.ids,
      missing: input.participants
        .map((p) => p.id)
        .filter((id) => !w.ids.includes(id)),
    })),
  };
}
