import { NewContestForm } from "@/components/new-contest-form";

export default function NewContestPage() {
  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>New Contest</h1>
        </div>
      </section>
      <NewContestForm />
    </main>
  );
}
