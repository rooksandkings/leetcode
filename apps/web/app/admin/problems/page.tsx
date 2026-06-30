import Link from "next/link";
import { FilePlus2, Wand2 } from "lucide-react";
import { ProblemTable } from "@/components/problem-table";
import { listProblems } from "@/lib/data";

export default async function AdminProblemsPage() {
  const problems = await listProblems();

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Problem Packages</h1>
        </div>
        <div className="actions">
          <Link className="secondary-button" href="/admin/ai">
            <Wand2 size={16} />
            AI Drafts
          </Link>
          <Link className="primary-button" href="/admin/problems/new">
            <FilePlus2 size={16} />
            New Problem
          </Link>
        </div>
      </section>
      <ProblemTable problems={problems} />
    </main>
  );
}
