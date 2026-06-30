import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { contests } from "@/lib/mock-data";
import { formatDateTime } from "@/lib/format";

export default function ContestsPage() {
  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Contests</p>
          <h1>Schedule</h1>
        </div>
      </section>
      <section className="grid">
        {contests.map((contest) => (
          <Link className="card" href={`/contests/${contest.slug}`} key={contest.slug}>
            <div className="page-header">
              <div>
                <h2>{contest.title}</h2>
                <p className="subtle">
                  {formatDateTime(contest.startsAt)} · {contest.registeredCount} registered
                </p>
              </div>
              <CalendarDays size={22} />
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}

