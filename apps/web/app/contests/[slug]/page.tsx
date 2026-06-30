import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ListChecks, Lock } from "lucide-react";
import { ContestRegistrationPanel } from "@/components/contest-registration-panel";
import { getContest, listContestProblems } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ContestPage({ params }: PageProps) {
  const { slug } = await params;
  const contest = await getContest(slug);

  if (!contest) {
    notFound();
  }

  const hasStarted = new Date() >= new Date(contest.startsAt);
  const contestProblems = hasStarted ? await listContestProblems(slug) : [];
  const lockedProblemLabels = ["A", "B", "C"];

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Contest</p>
          <h1>{contest.title}</h1>
          <p className="subtle">
            {formatDateTime(contest.startsAt)} - {contest.registeredCount} registered
          </p>
        </div>
        <div className="actions">
          <ContestRegistrationPanel contestSlug={contest.slug} />
          <Link className="secondary-button" href={`/contests/${contest.slug}/standings`}>
            <ListChecks size={16} />
            Standings
          </Link>
        </div>
      </section>

      <section className="grid">
        {hasStarted
          ? contestProblems.map((problem) => (
              <Link className="card" href={`/problems/${problem.slug}?contest=${contest.slug}`} key={problem.label}>
                <div className="page-header">
                  <div>
                    <p className="eyebrow">Problem {problem.label}</p>
                    <h2>{problem.title}</h2>
                  </div>
                  <ArrowRight size={18} />
                </div>
              </Link>
            ))
          : lockedProblemLabels.map((label) => (
              <div className="card" key={label}>
                <div className="page-header">
                  <div>
                    <p className="eyebrow">Problem {label}</p>
                    <h2>Locked</h2>
                    <p className="subtle">Available {formatDateTime(contest.startsAt)}</p>
                  </div>
                  <Lock size={18} />
                </div>
              </div>
            ))}
      </section>
    </main>
  );
}
