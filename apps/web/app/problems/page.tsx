import { ProblemTable } from "@/components/problem-table";
import { listProblems } from "@/lib/data";

export default async function ProblemsPage() {
  const problems = await listProblems();

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Problemset</p>
          <h1>Problems</h1>
          <p className="subtle">Standard input/output problems judged with Python 3.</p>
        </div>
      </section>
      <ProblemTable problems={problems} />
    </main>
  );
}
