import { notFound } from "next/navigation";
import { StatusPill } from "@/components/status-pill";
import { TestResults } from "@/components/test-results";
import { getSubmissionDetail } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SubmissionPage({ params }: PageProps) {
  const { id } = await params;
  const submission = await getSubmissionDetail(id);

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
            {submission.problemTitle} - {submission.language} - {formatDateTime(submission.submittedAt)}
          </p>
          {submission.contestSlug ? <p className="subtle">Contest: {submission.contestSlug}</p> : null}
        </div>
        <StatusPill verdict={submission.verdict} />
      </section>
      <section className="grid">
        <div className="panel">
          <h2>Result</h2>
          <p className="subtle">
            Runtime {submission.runtimeMs ?? 0} ms
            {submission.memoryKb ? ` - Memory ${submission.memoryKb} KB` : " - Memory recorded by production sandbox"}
          </p>
        </div>
        {submission.sourceCode ? (
          <div className="panel">
            <h2>Source</h2>
            <pre className="code-block">{submission.sourceCode}</pre>
          </div>
        ) : null}
        {submission.tests.length ? <TestResults tests={submission.tests} /> : null}
      </section>
    </main>
  );
}
