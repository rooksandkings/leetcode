import { ProblemTable } from "@/components/problem-table";
import { problems } from "@/lib/mock-data";

export default function ProblemsPage() {
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

