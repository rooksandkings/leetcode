import { Save } from "lucide-react";

export default function NewProblemPage() {
  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>New Problem</h1>
        </div>
      </section>
      <section className="panel">
        <form className="form-grid">
          <div className="grid two">
            <label className="field">
              <span>Title</span>
              <input name="title" placeholder="Sum Array" />
            </label>
            <label className="field">
              <span>Slug</span>
              <input name="slug" placeholder="sum-array" />
            </label>
          </div>
          <div className="grid three">
            <label className="field">
              <span>Checker</span>
              <select name="checker" defaultValue="token">
                <option value="exact">Exact</option>
                <option value="line">Line</option>
                <option value="token">Token</option>
                <option value="float">Float</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="field">
              <span>Time Limit</span>
              <input name="timeLimitMs" defaultValue="2000" />
            </label>
            <label className="field">
              <span>Memory Limit</span>
              <input name="memoryLimitMb" defaultValue="256" />
            </label>
          </div>
          <label className="field">
            <span>Statement</span>
            <textarea name="statement" />
          </label>
          <label className="field">
            <span>Package Manifest</span>
            <textarea name="manifest" className="code-block" defaultValue={'{\n  "checker": { "type": "token" },\n  "tests": []\n}'} />
          </label>
          <div className="actions">
            <button className="primary-button" type="button">
              <Save size={16} />
              Save Draft
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

