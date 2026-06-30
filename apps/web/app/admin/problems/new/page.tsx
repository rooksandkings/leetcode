import { NewProblemForm } from "@/components/new-problem-form";

export default function NewProblemPage() {
  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>New Problem</h1>
        </div>
      </section>
      <NewProblemForm />
    </main>
  );
}
