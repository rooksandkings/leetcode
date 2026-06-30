"use client";

import { useState } from "react";
import { Copy, Sparkles } from "lucide-react";
import type { CheckerType } from "@codearena/shared";
import type { ProblemDraft } from "@/lib/ai-drafts";

type DraftState = "idle" | "loading" | "ready" | "error";

export function AiDraftConsole() {
  const [prompt, setPrompt] = useState("Create an easy array problem where contestants compute a constrained sum.");
  const [checker, setChecker] = useState<CheckerType>("token");
  const [state, setState] = useState<DraftState>("idle");
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<ProblemDraft | null>(null);

  async function generate() {
    setState("loading");
    setMessage("");
    setDraft(null);

    const response = await fetch("/api/admin/ai-drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, checker }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setState("error");
      setMessage(payload.error ?? "Draft request failed");
      return;
    }

    const payload = (await response.json()) as ProblemDraft;
    setDraft(payload);
    setState("ready");
  }

  async function copyManifest() {
    if (!draft) {
      return;
    }

    await navigator.clipboard.writeText(draft.packageManifest);
    setMessage("Manifest copied");
  }

  return (
    <section className="grid two">
      <div className="panel">
        <h2>Generate Draft</h2>
        <form className="form-grid">
          <label className="field">
            <span>Prompt</span>
            <textarea name="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          </label>
          <label className="field">
            <span>Checker</span>
            <select name="checker" value={checker} onChange={(event) => setChecker(event.target.value as CheckerType)}>
              <option value="exact">Exact</option>
              <option value="line">Line</option>
              <option value="token">Token</option>
              <option value="float">Float</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <div className="actions">
            <button className="primary-button" disabled={state === "loading"} type="button" onClick={generate}>
              <Sparkles size={16} />
              {state === "loading" ? "Drafting" : "Draft"}
            </button>
            {draft ? (
              <button className="secondary-button" type="button" onClick={copyManifest}>
                <Copy size={16} />
                Manifest
              </button>
            ) : null}
            {message ? <span className="subtle">{message}</span> : null}
          </div>
        </form>
      </div>

      <div className="panel">
        <h2>Review Gates</h2>
        <div className="grid">
          {[
            "Statement clarity",
            "Reference solution",
            "Generated tests",
            "Wrong solutions",
            "Checker contract",
            "Validator and generator",
          ].map((item) => (
            <div className="review-row" key={item}>
              <strong>{item}</strong>
            </div>
          ))}
        </div>
      </div>

      {draft ? (
        <section className="panel draft-output">
          <div className="page-header">
            <div>
              <p className="eyebrow">{draft.provider} draft</p>
              <h2>{draft.title}</h2>
              <p className="subtle">
                {draft.slug} - {draft.difficulty} - {draft.checker} checker
              </p>
            </div>
          </div>

          <div className="grid two">
            <div>
              <h3>Statement</h3>
              <pre className="code-block">{draft.statementMarkdown}</pre>
            </div>
            <div>
              <h3>Package Manifest</h3>
              <pre className="code-block">{draft.packageManifest}</pre>
            </div>
          </div>

          <div className="grid three">
            <div>
              <h3>Samples</h3>
              <pre className="code-block">{draft.samples.map((sample) => `Input:\n${sample.input}\nOutput:\n${sample.output}`).join("\n---\n")}</pre>
            </div>
            <div>
              <h3>Hidden Test Ideas</h3>
              <ul>
                {draft.hiddenTestIdeas.map((idea) => (
                  <li key={idea}>{idea}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Checklist</h3>
              <ul>
                {draft.reviewChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid three">
            <div>
              <h3>Reference</h3>
              <pre className="code-block">{draft.referenceSolution}</pre>
            </div>
            <div>
              <h3>Validator</h3>
              <pre className="code-block">{draft.validatorSketch}</pre>
            </div>
            <div>
              <h3>Generator</h3>
              <pre className="code-block">{draft.generatorSketch}</pre>
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
}

