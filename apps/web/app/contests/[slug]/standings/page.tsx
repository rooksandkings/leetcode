import { notFound } from "next/navigation";
import { StandingsTable } from "@/components/standings-table";
import { getContest, getStandings, listContestProblems } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

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
  const status = standingsStatus(contest);

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">ICPC Standings</p>
          <h1>{contest.title}</h1>
          {status ? <p className="subtle">{status}</p> : null}
        </div>
      </section>
      <StandingsTable rows={rows} labels={labels} />
    </main>
  );
}

function standingsStatus(contest: { standingsFrozenAt?: string; standingsReleasedAt?: string }) {
  if (!contest.standingsFrozenAt) {
    return "";
  }

  const now = Date.now();
  const frozenAt = new Date(contest.standingsFrozenAt).getTime();
  const releasedAt = contest.standingsReleasedAt ? new Date(contest.standingsReleasedAt).getTime() : Number.POSITIVE_INFINITY;

  if (now >= frozenAt && now < releasedAt) {
    return contest.standingsReleasedAt
      ? `Frozen at ${formatDateTime(contest.standingsFrozenAt)} - final release ${formatDateTime(contest.standingsReleasedAt)}`
      : `Frozen at ${formatDateTime(contest.standingsFrozenAt)}`;
  }

  if (contest.standingsReleasedAt && now >= releasedAt) {
    return `Final standings released ${formatDateTime(contest.standingsReleasedAt)}`;
  }

  return `Freezes at ${formatDateTime(contest.standingsFrozenAt)}`;
}
