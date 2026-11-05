const key = (option: string) =>
  option.toLowerCase().replace(/\s+/g, " ").trim();

// Counts ranked preferences three ways, so the Master can show the group a
// fair winner when a plain majority vote doesn't settle it. Each ballot lists
// options best first; options a voter left out rank below the listed ones.
export function rankOptions(ballots: string[][], options?: string[]) {
  const names = new Map<string, string>();
  for (const option of [...(options ?? []), ...ballots.flat()]) {
    if (!names.has(key(option))) names.set(key(option), option.trim());
  }
  const all = [...names.keys()];
  const ranked = ballots.map((ballot) => [...new Set(ballot.map(key))]);
  const position = (ranking: string[], option: string) => {
    const i = ranking.indexOf(option);
    return i < 0 ? ranking.length : i;
  };

  const scores = all.map((option) => ({
    option: names.get(option)!,
    first_choices: ranked.filter((r) => r[0] === option).length,
    borda: ranked.reduce((sum, r) => {
      const i = r.indexOf(option);
      return sum + (i < 0 ? 0 : all.length - 1 - i);
    }, 0),
  }));
  scores.sort((a, b) => b.borda - a.borda || b.first_choices - a.first_choices);

  const beats = (a: string, b: string) => {
    const prefer = ranked.filter((r) => position(r, a) < position(r, b)).length;
    const against = ranked.filter(
      (r) => position(r, b) < position(r, a),
    ).length;
    return prefer > against;
  };
  const condorcet = all.find((a) => all.every((b) => a === b || beats(a, b)));

  const rounds: { counts: Record<string, number>; eliminated?: string }[] = [];
  let remaining = [...all];
  let runoffWinner: string | null = null;
  while (remaining.length > 0) {
    const counts = Object.fromEntries(remaining.map((o) => [o, 0]));
    let active = 0;
    for (const r of ranked) {
      const top = r.find((o) => remaining.includes(o));
      if (top) {
        counts[top] += 1;
        active += 1;
      }
    }
    const named = Object.fromEntries(
      Object.entries(counts).map(([o, n]) => [names.get(o)!, n]),
    );
    const leader = remaining.reduce((a, b) => (counts[b] > counts[a] ? b : a));
    if (counts[leader] * 2 > active || remaining.length === 1) {
      rounds.push({ counts: named });
      runoffWinner = active > 0 ? leader : null;
      break;
    }
    const fewest = Math.min(...remaining.map((o) => counts[o]));
    const out = remaining.filter((o) => counts[o] === fewest);
    if (out.length === remaining.length) {
      rounds.push({ counts: named });
      break;
    }
    rounds.push({
      counts: named,
      eliminated: out.map((o) => names.get(o)!).join(", "),
    });
    remaining = remaining.filter((o) => !out.includes(o));
  }

  return {
    ballots: ranked.length,
    scores,
    condorcet_winner: condorcet ? names.get(condorcet)! : null,
    runoff: {
      winner: runoffWinner ? names.get(runoffWinner)! : null,
      rounds,
    },
  };
}
