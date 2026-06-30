"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import type { CheckerType, ProblemSummary } from "@codearena/shared";

type SaveState = "idle" | "saving" | "saved" | "error";
type VerifyState = "idle" | "verifying" | "passed" | "failed" | "error";

type VerificationReport = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

const defaultManifest = JSON.stringify(
  {
    checker: { type: "token" },
    tests: [
      {
        name: "sample-1",
        input: "samples/1.in",
        expected: "samples/1.out",
        hidden: false,
      },
    ],
  },
  null,
  2,
);

export function NewProblemForm() {
  const [title, setTitle] = useState("New Array Challenge");
  const [slug, setSlug] = useState("new-array-challenge");
  const [difficulty, setDifficulty] = useState<ProblemSummary["difficulty"]>("easy");
  const [checker, setChecker] = useState<CheckerType>("token");
  const [timeLimitMs, setTimeLimitMs] = useState("2000");
  const [memoryLimitMb, setMemoryLimitMb] = useState("256");
  const [tags, setTags] = useState("implementation, arrays");
  const [statement, setStatement] = useState("Write a complete ICPC-style statement before publishing this draft.");
  const [manifest, setManifest] = useState(defaultManifest);
  const [packagePath, setPackagePath] = useState("problems/sum-array");
  const [packageFile, setPackageFile] = useState<File | null>(null);
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [verificationReport, setVerificationReport] = useState<VerificationReport | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  async function verifyPackage() {
    setVerifyState("verifying");
    setVerificationReport(null);

    const response = await fetch("/api/admin/problem-packages/verify", {
      method: "POST",
      body: packageFile ? packageFormData(packageFile) : JSON.stringify({ packagePath }),
      headers: packageFile ? undefined : { "content-type": "application/json" },
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setVerifyState("error");
      setVerificationReport({ ok: false, errors: [payload.error ?? "Package verification failed"], warnings: [] });
      return;
    }

    const payload = (await response.json()) as { report: VerificationReport };
    setVerificationReport(payload.report);
    setVerifyState(payload.report.ok ? "passed" : "failed");
  }

  async function saveDraft() {
    setState("saving");
    setMessage("");

    const response = await fetch("/api/admin/problems", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        difficulty,
        checker,
        timeLimitMs: Number(timeLimitMs),
        memoryLimitMb: Number(memoryLimitMb),
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        statement,
        manifest,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setState("error");
      setMessage(payload.error ?? "Draft save failed");
      return;
    }

    const payload = (await response.json()) as { slug: string; status: string };
    setState("saved");
    setMessage(`Saved ${payload.slug} as ${payload.status}`);
  }

  function updateChecker(value: CheckerType) {
    setChecker(value);
    try {
      const parsed = JSON.parse(manifest) as { checker?: { type?: string } };
      setManifest(JSON.stringify({ ...parsed, checker: { ...(parsed.checker ?? {}), type: value } }, null, 2));
    } catch {
      // Keep the user's manifest text if it is temporarily invalid.
    }
  }

  return (
    <section className="panel">
      <form className="form-grid">
        <div className="grid two">
          <label className="field">
            <span>Title</span>
            <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="field">
            <span>Slug</span>
            <input name="slug" value={slug} onChange={(event) => setSlug(event.target.value)} />
          </label>
        </div>
        <div className="grid three">
          <label className="field">
            <span>Checker</span>
            <select name="checker" value={checker} onChange={(event) => updateChecker(event.target.value as CheckerType)}>
              <option value="exact">Exact</option>
              <option value="line">Line</option>
              <option value="token">Token</option>
              <option value="float">Float</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="field">
            <span>Difficulty</span>
            <select name="difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value as ProblemSummary["difficulty"])}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label className="field">
            <span>Tags</span>
            <input name="tags" value={tags} onChange={(event) => setTags(event.target.value)} />
          </label>
        </div>
        <div className="grid two">
          <label className="field">
            <span>Time Limit</span>
            <input name="timeLimitMs" value={timeLimitMs} onChange={(event) => setTimeLimitMs(event.target.value)} />
          </label>
          <label className="field">
            <span>Memory Limit</span>
            <input name="memoryLimitMb" value={memoryLimitMb} onChange={(event) => setMemoryLimitMb(event.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Statement</span>
          <textarea name="statement" value={statement} onChange={(event) => setStatement(event.target.value)} />
        </label>
        <label className="field">
          <span>Package Manifest</span>
          <textarea name="manifest" className="code-block" value={manifest} onChange={(event) => setManifest(event.target.value)} />
        </label>
        <section className="result-panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Package Verification</p>
              <h2>Verify Before Publish</h2>
            </div>
          </div>
          <div className="form-grid">
            <div className="grid two">
              <label className="field">
                <span>Local Package Path</span>
                <input name="packagePath" value={packagePath} onChange={(event) => setPackagePath(event.target.value)} />
              </label>
              <label className="field">
                <span>Package Zip</span>
                <input
                  accept=".zip"
                  name="packageZip"
                  type="file"
                  onChange={(event) => setPackageFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div className="actions">
              <button className="secondary-button" disabled={verifyState === "verifying"} type="button" onClick={verifyPackage}>
                {verifyState === "verifying" ? "Verifying" : "Verify Package"}
              </button>
              {verifyState === "passed" ? <span className="status accepted">verified</span> : null}
              {verifyState === "failed" || verifyState === "error" ? <span className="status failed">failed</span> : null}
            </div>
            {verificationReport ? (
              <div className="grid two">
                <div>
                  <h3>Errors</h3>
                  {verificationReport.errors.length ? (
                    <ul>
                      {verificationReport.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="subtle">None</p>
                  )}
                </div>
                <div>
                  <h3>Warnings</h3>
                  {verificationReport.warnings.length ? (
                    <ul>
                      {verificationReport.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="subtle">None</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>
        <div className="actions">
          <button className="primary-button" disabled={state === "saving"} type="button" onClick={saveDraft}>
            <Save size={16} />
            {state === "saving" ? "Saving" : "Save Draft"}
          </button>
          {message ? <span className={state === "error" ? "status failed" : "subtle"}>{message}</span> : null}
        </div>
      </form>
    </section>
  );
}

function packageFormData(file: File) {
  const formData = new FormData();
  formData.set("package", file);
  return formData;
}
