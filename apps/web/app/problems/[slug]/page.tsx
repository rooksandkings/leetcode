import { notFound } from "next/navigation";
import { SubmissionPanel } from "@/components/submission-panel";
import { getProblem } from "@/lib/data";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ contest?: string }>;
};

export default async function ProblemPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { contest } = await searchParams;
  const problem = await getProblem(slug);

  if (!problem) {
    notFound();
  }

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Problem</p>
          <h1>{problem.title}</h1>
          <p className="subtle">
            {problem.timeLimitMs} ms · {problem.memoryLimitMb} MB · {problem.checker} checker
          </p>
        </div>
      </section>

      <section className="grid two">
        <article className="panel statement">
          <h2>Statement</h2>
          <p>{problem.statement}</p>
          <h3>Input</h3>
          <p>{problem.input}</p>
          <h3>Output</h3>
          <p>{problem.output}</p>
          {problem.constraints.length ? (
            <>
              <h3>Constraints</h3>
              <ul>
                {problem.constraints.map((constraint) => (
                  <li key={constraint}>{constraint}</li>
                ))}
              </ul>
            </>
          ) : null}
          {problem.samples.length ? (
            <>
              <h3>Sample</h3>
              {problem.samples.map((sample, index) => (
                <div className="grid two" key={index}>
                  <pre>{sample.input}</pre>
                  <pre>{sample.output}</pre>
                </div>
              ))}
            </>
          ) : null}
        </article>

        <SubmissionPanel contestSlug={contest} problemSlug={problem.slug} />
      </section>
    </main>
  );
}
