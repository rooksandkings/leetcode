"use client";

import { useState } from "react";
import { Play, RotateCcw } from "lucide-react";

const starterCode = `import sys

def main() -> None:
    data = list(map(int, sys.stdin.read().split()))
    n = data[0]
    values = data[1:1+n]
    print(sum(values))

if __name__ == "__main__":
    main()
`;

type SubmitState = "idle" | "submitting" | "queued" | "error";

export function SubmissionPanel({ problemSlug }: { problemSlug: string }) {
  const [code, setCode] = useState(starterCode);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  async function submit() {
    setState("submitting");
    setMessage("");

    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        problemSlug,
        language: "python3",
        sourceCode: code,
      }),
    });

    if (!response.ok) {
      setState("error");
      setMessage("Submission was not accepted by the API");
      return;
    }

    const payload = (await response.json()) as { id: string; status: string };
    setState("queued");
    setMessage(`Submission ${payload.id} is ${payload.status}`);
  }

  return (
    <section className="panel">
      <div className="page-header">
        <div>
          <p className="eyebrow">Python 3</p>
          <h2>Submit</h2>
        </div>
        <button className="secondary-button" type="button" onClick={() => setCode(starterCode)}>
          <RotateCcw size={16} />
          Reset
        </button>
      </div>
      <div className="form-grid">
        <textarea
          aria-label="Python source code"
          className="editor"
          spellCheck={false}
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <div className="actions">
          <button className="primary-button" type="button" disabled={state === "submitting"} onClick={submit}>
            <Play size={16} />
            {state === "submitting" ? "Submitting" : "Submit"}
          </button>
          {message ? <span className="subtle">{message}</span> : null}
        </div>
      </div>
    </section>
  );
}

