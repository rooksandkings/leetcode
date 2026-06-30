import Link from "next/link";
import type { ProblemSummary } from "@codearena/shared";

export function ProblemTable({ problems }: { problems: ProblemSummary[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Problem</th>
            <th>Difficulty</th>
            <th>Tags</th>
            <th>Accepted</th>
          </tr>
        </thead>
        <tbody>
          {problems.map((problem) => (
            <tr key={problem.slug}>
              <td>
                <Link href={`/problems/${problem.slug}`}>
                  <strong>{problem.title}</strong>
                </Link>
                <div className="subtle">{problem.slug}</div>
              </td>
              <td>{problem.difficulty}</td>
              <td>
                <div className="tag-list">
                  {problem.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </td>
              <td>
                {problem.acceptedCount}/{problem.submissionCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

