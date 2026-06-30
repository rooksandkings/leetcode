"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import type { CheckerType, ProblemSummary } from "@codearena/shared";

type SaveState = "idle" | "saving" | "saved" | "error";
type VerifyState = "idle" | "verifying" | "passed" | "failed" | "error";
type StoreState = "idle" | "storing" | "stored" | "error";
type ReviewState = "idle" | "saving" | "saved" | "error";

type VerificationReport = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  package?: {
    slug: string;
    checker: string;
    hasCustomChecker: boolean;
  };
};

type StoredArtifact = {
  storagePath: string;
  localPath?: string;
  checksumSha256: string;
  sizeBytes: number;
  report: VerificationReport;
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
  const [storeState, setStoreState] = useState<StoreState>("idle");
  const [reviewState, setReviewState] = useState<ReviewState>("idle");
  const [verificationReport, setVerificationReport] = useState<VerificationReport | null>(null);
  const [storedArtifact, setStoredArtifact] = useState<StoredArtifact | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  async function verifyPackage() {
    setVerifyState("verifying");
    setStoreState("idle");
    setReviewState("idle");
    setVerificationReport(null);
    setStoredArtifact(null);

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

  async function storePackage() {
    setStoreState("storing");
    setStoredArtifact(null);

    const response = await fetch("/api/admin/problem-packages/store", {
      method: "POST",
      body: packageFile ? packageFormData(packageFile) : JSON.stringify({ packagePath }),
      headers: packageFile ? undefined : { "content-type": "application/json" },
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setStoreState("error");
      setVerificationReport({ ok: false, errors: [payload.error ?? "Package storage failed"], warnings: [] });
      return;
    }

    const payload = (await response.json()) as { artifact: StoredArtifact };
    setStoredArtifact(payload.artifact);
    setVerificationReport(payload.artifact.report);
    setVerifyState(payload.artifact.report.ok ? "passed" : "failed");
    setStoreState("stored");
  }

  async function saveCheckerReview(status: "not_required" | "approved" | "rejected") {
    if (!storedArtifact?.report.package) {
      setReviewState("error");
      return;
    }

    setReviewState("saving");
    const response = await fetch("/api/admin/problem-packages/checker-review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        storagePath: storedArtifact.storagePath,
        checksumSha256: storedArtifact.checksumSha256,
        packageSlug: storedArtifact.report.package.slug,
        hasCustomChecker: storedArtifact.report.package.hasCustomChecker,
        status,
        notes: reviewNotes,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setReviewState("error");
      setVerificationReport({
        ok: false,
        errors: [payload.error ?? "Checker review save failed"],
        warnings: [],
        package: storedArtifact.report.package,
      });
      return;
    }

    setReviewState("saved");
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
              <button className="secondary-button" disabled={storeState === "storing"} type="button" onClick={storePackage}>
                {storeState === "storing" ? "Storing" : "Store Verified"}
              </button>
              {verifyState === "passed" ? <span className="status accepted">verified</span> : null}
              {verifyState === "failed" || verifyState === "error" ? <span className="status failed">failed</span> : null}
              {storeState === "stored" ? <span className="status accepted">stored</span> : null}
              {storeState === "error" ? <span className="status failed">storage failed</span> : null}
            </div>
            {storedArtifact ? (
              <div className="result-panel">
                <h3>Stored Artifact</h3>
                <p className="subtle">{storedArtifact.storagePath}</p>
                <p className="subtle">SHA-256 {storedArtifact.checksumSha256}</p>
                {storedArtifact.localPath ? <p className="subtle">{storedArtifact.localPath}</p> : null}
                {storedArtifact.report.package?.hasCustomChecker ? (
                  <div className="form-grid">
                    <label className="field">
                      <span>Checker Review Notes</span>
                      <textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} />
                    </label>
                    <div className="actions">
                      <button className="secondary-button" disabled={reviewState === "saving"} type="button" onClick={() => saveCheckerReview("approved")}>
                        Approve Checker
                      </button>
                      <button className="danger-button" disabled={reviewState === "saving"} type="button" onClick={() => saveCheckerReview("rejected")}>
                        Reject Checker
                      </button>
                      {reviewState === "saved" ? <span className="status accepted">review saved</span> : null}
                      {reviewState === "error" ? <span className="status failed">review failed</span> : null}
                    </div>
                  </div>
                ) : (
                  <div className="actions">
                    <button className="secondary-button" disabled={reviewState === "saving"} type="button" onClick={() => saveCheckerReview("not_required")}>
                      Mark Checker Review Not Required
                    </button>
                    {reviewState === "saved" ? <span className="status accepted">review saved</span> : null}
                    {reviewState === "error" ? <span className="status failed">review failed</span> : null}
                  </div>
                )}
              </div>
            ) : null}
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
