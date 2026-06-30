import Link from "next/link";
import type { ProblemSummary } from "@codearena/shared";

export type AdminProblemRow = ProblemSummary & {
  status: "draft" | "published";
  updatedAt?: string;
};

export function AdminProblemTable({ problems }: { problems: AdminProblemRow[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Problem</th>
            <th>Status</th>
            <th>Difficulty</th>
            <th>Tags</th>
            <th>Accepted</th>
          </tr>
        </thead>
        <tbody>
          {problems.map((problem) => (
            <tr key={`${problem.status}-${problem.slug}`}>
              <td>
                {problem.status === "published" ? (
                  <Link href={`/problems/${problem.slug}`}>
                    <strong>{problem.title}</strong>
                  </Link>
                ) : (
                  <strong>{problem.title}</strong>
                )}
                <div className="subtle">{problem.slug}</div>
              </td>
              <td>
                <span className={problem.status === "published" ? "status accepted" : "status pending"}>{problem.status}</span>
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

