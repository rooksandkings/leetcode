import { notFound } from "next/navigation";
import { StandingsTable } from "@/components/standings-table";
import { contestEvents, contestProblems, contests } from "@/lib/mock-data";
import { deriveStandings } from "@/lib/icpc";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function StandingsPage({ params }: PageProps) {
  const { slug } = await params;
  const contest = contests.find((candidate) => candidate.slug === slug);

  if (!contest) {
    notFound();
  }

  const labels = contestProblems.map((problem) => problem.label);
  const rows = deriveStandings(contestEvents, labels);

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">ICPC Standings</p>
          <h1>{contest.title}</h1>
        </div>
      </section>
      <StandingsTable rows={rows} labels={labels} />
    </main>
  );
}

