import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ListChecks } from "lucide-react";
import { getContest, listContestProblems } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ContestPage({ params }: PageProps) {
  const { slug } = await params;
  const [contest, contestProblems] = await Promise.all([getContest(slug), listContestProblems(slug)]);

  if (!contest) {
    notFound();
  }

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Contest</p>
          <h1>{contest.title}</h1>
          <p className="subtle">
            {formatDateTime(contest.startsAt)} · {contest.registeredCount} registered
          </p>
        </div>
        <Link className="primary-button" href={`/contests/${contest.slug}/standings`}>
          <ListChecks size={16} />
          Standings
        </Link>
      </section>

      <section className="grid">
        {contestProblems.map((problem) => (
          <Link className="card" href={`/problems/${problem.slug}?contest=${contest.slug}`} key={problem.label}>
            <div className="page-header">
              <div>
                <p className="eyebrow">Problem {problem.label}</p>
                <h2>{problem.title}</h2>
              </div>
              <ArrowRight size={18} />
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
