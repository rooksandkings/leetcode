import type { StandingRow } from "@codearena/shared";

export type ContestEvent = {
  handle: string;
  problemLabel: string;
  verdict: string;
  minute: number;
};

export function deriveStandings(
  events: readonly ContestEvent[],
  problemLabels: readonly string[],
  registeredHandles: readonly string[] = [],
): StandingRow[] {
  const handles = [...new Set([...events.map((event) => event.handle), ...registeredHandles])].sort();
  const rows = handles.map((handle) => {
    const problemResults: StandingRow["problemResults"] = {};

    for (const label of problemLabels) {
      const attempts = events
        .filter((event) => event.handle === handle && event.problemLabel === label)
        .sort((a, b) => a.minute - b.minute);
      const firstAccepted = attempts.find((event) => event.verdict === "accepted");

      if (!attempts.length) {
        continue;
      }

      if (!firstAccepted) {
        problemResults[label] = {
          solved: false,
          attemptsBeforeSolve: attempts.length,
          penaltyMinutes: 0,
        };
        continue;
      }

      const attemptsBeforeSolve = attempts.filter(
        (event) => event.minute < firstAccepted.minute && event.verdict !== "accepted",
      ).length;
      problemResults[label] = {
        solved: true,
        attemptsBeforeSolve,
        penaltyMinutes: firstAccepted.minute + attemptsBeforeSolve * 20,
      };
    }

    const solvedResults = Object.values(problemResults).filter((result) => result.solved);
    const penaltyMinutes = solvedResults.reduce((total, result) => total + result.penaltyMinutes, 0);
    const acceptedMinutes = events
      .filter((event) => event.handle === handle && event.verdict === "accepted")
      .map((event) => event.minute);

    return {
      rank: 0,
      handle,
      solved: solvedResults.length,
      penaltyMinutes,
      lastAcceptedMinute: acceptedMinutes.length ? Math.max(...acceptedMinutes) : null,
      problemResults,
    };
  });

  rows.sort((a, b) => {
    if (b.solved !== a.solved) return b.solved - a.solved;
    if (a.penaltyMinutes !== b.penaltyMinutes) return a.penaltyMinutes - b.penaltyMinutes;
    return (a.lastAcceptedMinute ?? Number.MAX_SAFE_INTEGER) - (b.lastAcceptedMinute ?? Number.MAX_SAFE_INTEGER);
  });

  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}
