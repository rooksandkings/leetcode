import Link from "next/link";
import { formatDateTime } from "@/lib/format";

export type AdminContestRow = {
  slug: string;
  title: string;
  status: "draft" | "published";
  startsAt: string;
  endsAt: string;
  registrationClosesAt?: string;
  problemCount: number;
  updatedAt?: string;
};

export function AdminContestTable({ contests }: { contests: AdminContestRow[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Contest</th>
            <th>Status</th>
            <th>Window</th>
            <th>Registration</th>
            <th>Problems</th>
          </tr>
        </thead>
        <tbody>
          {contests.map((contest) => (
            <tr key={`${contest.status}-${contest.slug}`}>
              <td>
                {contest.status === "published" ? (
                  <Link href={`/contests/${contest.slug}`}>
                    <strong>{contest.title}</strong>
                  </Link>
                ) : (
                  <strong>{contest.title}</strong>
                )}
                <div className="subtle">{contest.slug}</div>
              </td>
              <td>
                <span className={contest.status === "published" ? "status accepted" : "status pending"}>{contest.status}</span>
              </td>
              <td>
                <div>{formatDateTime(contest.startsAt)}</div>
                <div className="subtle">Ends {formatDateTime(contest.endsAt)}</div>
              </td>
              <td>{contest.registrationClosesAt ? formatDateTime(contest.registrationClosesAt) : "Start time"}</td>
              <td>{contest.problemCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
