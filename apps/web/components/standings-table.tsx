import type { StandingRow } from "@codearena/shared";

export function StandingsTable({ rows, labels }: { rows: StandingRow[]; labels: string[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Handle</th>
            <th>Solved</th>
            <th>Penalty</th>
            {labels.map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.handle}>
              <td>{row.rank}</td>
              <td>
                <strong>{row.handle}</strong>
              </td>
              <td>{row.solved}</td>
              <td>{row.penaltyMinutes}</td>
              {labels.map((label) => {
                const result = row.problemResults[label];
                return (
                  <td key={label}>
                    <span className={`problem-score ${result?.solved ? "solved" : ""}`}>
                      {result?.solved ? `+${result.attemptsBeforeSolve || ""}` : result ? `-${result.attemptsBeforeSolve}` : "."}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

