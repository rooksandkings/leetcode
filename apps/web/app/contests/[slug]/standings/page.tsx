import { notFound } from "next/navigation";
import { StandingsTable } from "@/components/standings-table";
import { getContest, getStandings, listContestProblems } from "@/lib/data";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function StandingsPage({ params }: PageProps) {
  const { slug } = await params;
  const [contest, contestProblems] = await Promise.all([getContest(slug), listContestProblems(slug)]);

  if (!contest) {
    notFound();
  }

  const labels = contestProblems.map((problem) => problem.label);
  const rows = await getStandings(contest.slug, labels);

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
