import { Sparkles } from "lucide-react";

export default function AiDraftsPage() {
  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Admin AI</p>
          <h1>Draft Queue</h1>
        </div>
      </section>
      <section className="grid two">
        <div className="panel">
          <h2>Generate Draft</h2>
          <form className="form-grid">
            <label className="field">
              <span>Prompt</span>
              <textarea name="prompt" />
            </label>
            <label className="field">
              <span>Checker</span>
              <select name="checker" defaultValue="token">
                <option value="token">Token</option>
                <option value="line">Line</option>
                <option value="float">Float</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <button className="primary-button" type="button">
              <Sparkles size={16} />
              Draft
            </button>
          </form>
        </div>
        <div className="panel">
          <h2>Review Gates</h2>
          <div className="grid">
            {["Statement", "Reference solution", "Generated tests", "Wrong solutions", "Checker contract"].map((item) => (
              <div className="card" key={item}>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

