import { notFound } from "next/navigation";
import { TestResults } from "@/components/test-results";
import { StatusPill } from "@/components/status-pill";
import { submissionTests, submissions } from "@/lib/mock-data";
import { formatDateTime } from "@/lib/format";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SubmissionPage({ params }: PageProps) {
  const { id } = await params;
  const submission = submissions.find((candidate) => candidate.id === id);

  if (!submission) {
    notFound();
  }

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Submission</p>
          <h1>{submission.id}</h1>
          <p className="subtle">
            {submission.problemTitle} · {submission.language} · {formatDateTime(submission.submittedAt)}
          </p>
        </div>
        <StatusPill verdict={submission.verdict} />
      </section>
      <section className="grid">
        <div className="panel">
          <h2>Result</h2>
          <p className="subtle">
            Runtime {submission.runtimeMs ?? 0} ms · Memory recorded by production sandbox
          </p>
        </div>
        <TestResults tests={submissionTests} />
      </section>
    </main>
  );
}

