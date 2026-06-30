import Link from "next/link";
import { FilePlus2, Wand2 } from "lucide-react";
import { AdminProblemTable } from "@/components/admin-problem-table";
import { listAdminProblems } from "@/lib/data";

export default async function AdminProblemsPage() {
  const problems = await listAdminProblems();

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
      <AdminProblemTable problems={problems} />
    </main>
  );
}
