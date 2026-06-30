import Link from "next/link";
import { CalendarPlus, FileText } from "lucide-react";
import { AdminContestTable } from "@/components/admin-contest-table";
import { listAdminContests } from "@/lib/data";

export default async function AdminContestsPage() {
  const contests = await listAdminContests();

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Contests</h1>
        </div>
        <div className="actions">
          <Link className="secondary-button" href="/admin/problems">
            <FileText size={16} />
            Problems
          </Link>
          <Link className="primary-button" href="/admin/contests/new">
            <CalendarPlus size={16} />
            New Contest
          </Link>
        </div>
      </section>
      <AdminContestTable contests={contests} />
    </main>
  );
}
