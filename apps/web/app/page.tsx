import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Trophy } from "lucide-react";
import { ProblemTable } from "@/components/problem-table";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { StatusPill } from "@/components/status-pill";
import { listContests, listProblems, listRecentSubmissions } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export default async function DashboardPage() {
  const [problems, contests, submissions] = await Promise.all([listProblems(), listContests(), listRecentSubmissions()]);
  const accepted = submissions.filter((submission) => submission.verdict === "accepted").length;
  const nextContest = contests[0];
  const firstProblem = problems[0];

  return (
    <main className="page">
      <RealtimeRefresh
        scope="dashboard"
        subscriptions={[{ table: "submissions" }, { table: "contest_live_events" }]}
      />
      <section className="page-header">
        <div>
          <p className="eyebrow">Competition Console</p>
          <h1>CodeArena</h1>
          <p className="subtle">Python-only ICPC contests with admin-reviewed problem packages.</p>
        </div>
        {firstProblem ? (
          <Link className="primary-button" href={`/problems/${firstProblem.slug}`}>
            <ArrowRight size={16} />
            Open Problem A
          </Link>
        ) : null}
      </section>

      <section className="stat-grid">
        <div className="stat">
          <CheckCircle2 size={18} color="#166b54" />
          <strong>{accepted}</strong>
          <span className="subtle">accepted today</span>
        </div>
        <div className="stat">
          <Trophy size={18} color="#a65f00" />
          <strong>{contests.length}</strong>
          <span className="subtle">scheduled contests</span>
        </div>
        <div className="stat">
          <Clock3 size={18} color="#364fc7" />
          <strong>1s</strong>
          <span className="subtle">seed problem limit</span>
        </div>
        <div className="stat">
          <strong>{problems.length}</strong>
          <span className="subtle">published problems</span>
        </div>
      </section>

      <section className="grid two">
        <div className="grid">
          <div className="page-header">
            <h2>Problems</h2>
            <Link className="secondary-button" href="/problems">
              All Problems
            </Link>
          </div>
          <ProblemTable problems={problems} />
        </div>

        <aside className="grid">
          <section className="panel">
            <h2>Next Contest</h2>
            {nextContest ? (
              <>
                <h3>{nextContest.title}</h3>
                <p className="subtle">{formatDateTime(nextContest.startsAt)}</p>
                <Link className="secondary-button" href={`/contests/${nextContest.slug}`}>
                  Contest Room
                </Link>
              </>
            ) : (
              <p className="subtle">No public contests yet.</p>
            )}
          </section>

          <section className="panel">
            <h2>Recent Submissions</h2>
            <div className="grid">
              {submissions.map((submission) => (
                <Link className="card" href={`/submissions/${submission.id}`} key={submission.id}>
                  <strong>{submission.problemTitle}</strong>
                  <div className="actions">
                    <StatusPill verdict={submission.verdict} />
                    <span className="subtle">{formatDateTime(submission.submittedAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
