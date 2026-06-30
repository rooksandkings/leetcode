import { AiDraftConsole } from "@/components/ai-draft-console";

export default function AiDraftsPage() {
  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Admin AI</p>
          <h1>Draft Queue</h1>
        </div>
      </section>
      <AiDraftConsole />
    </main>
  );
}
