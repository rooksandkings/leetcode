"use client";

import { useState } from "react";
import { Save } from "lucide-react";

type SaveState = "idle" | "saving" | "saved" | "error";

const defaultAssignments = `A:sum-array
B:balanced-round
C:circle-distance`;

export function NewContestForm() {
  const [title, setTitle] = useState("Autumn Python Invitational");
  const [slug, setSlug] = useState("autumn-python-invitational");
  const [description, setDescription] = useState("ICPC-style Python contest with locked problem statements and frozen standings.");
  const [startsAt, setStartsAt] = useState("2026-07-20T18:00");
  const [endsAt, setEndsAt] = useState("2026-07-20T21:00");
  const [registrationOpensAt, setRegistrationOpensAt] = useState("2026-07-01T00:00");
  const [registrationClosesAt, setRegistrationClosesAt] = useState("2026-07-20T17:55");
  const [standingsFrozenAt, setStandingsFrozenAt] = useState("2026-07-20T20:30");
  const [standingsReleasedAt, setStandingsReleasedAt] = useState("2026-07-20T21:05");
  const [assignments, setAssignments] = useState(defaultAssignments);
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  async function saveDraft() {
    setState("saving");
    setMessage("");

    let requestPayload;
    try {
      requestPayload = {
        title,
        slug,
        description,
        startsAt: toIso(startsAt),
        endsAt: toIso(endsAt),
        registrationOpensAt: optionalIso(registrationOpensAt),
        registrationClosesAt: optionalIso(registrationClosesAt),
        standingsFrozenAt: optionalIso(standingsFrozenAt),
        standingsReleasedAt: optionalIso(standingsReleasedAt),
        problems: parseAssignments(assignments),
      };
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Contest form is invalid");
      return;
    }

    const response = await fetch("/api/admin/contests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setState("error");
      setMessage(payload.error ?? "Contest save failed");
      return;
    }

    const responsePayload = (await response.json()) as { slug: string; status: string; problemCount: number };
    setState("saved");
    setMessage(`Saved ${responsePayload.slug} as ${responsePayload.status} with ${responsePayload.problemCount} problems`);
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
        <label className="field">
          <span>Description</span>
          <textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <div className="grid two">
          <label className="field">
            <span>Start</span>
            <input name="startsAt" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
          </label>
          <label className="field">
            <span>End</span>
            <input name="endsAt" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
          </label>
        </div>
        <div className="grid two">
          <label className="field">
            <span>Registration Opens</span>
            <input
              name="registrationOpensAt"
              type="datetime-local"
              value={registrationOpensAt}
              onChange={(event) => setRegistrationOpensAt(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Registration Closes</span>
            <input
              name="registrationClosesAt"
              type="datetime-local"
              value={registrationClosesAt}
              onChange={(event) => setRegistrationClosesAt(event.target.value)}
            />
          </label>
        </div>
        <div className="grid two">
          <label className="field">
            <span>Standings Freeze</span>
            <input
              name="standingsFrozenAt"
              type="datetime-local"
              value={standingsFrozenAt}
              onChange={(event) => setStandingsFrozenAt(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Standings Release</span>
            <input
              name="standingsReleasedAt"
              type="datetime-local"
              value={standingsReleasedAt}
              onChange={(event) => setStandingsReleasedAt(event.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span>Problem Assignments</span>
          <textarea name="assignments" className="code-block" value={assignments} onChange={(event) => setAssignments(event.target.value)} />
        </label>
        <div className="actions">
          <button className="primary-button" disabled={state === "saving"} type="button" onClick={saveDraft}>
            <Save size={16} />
            {state === "saving" ? "Saving" : "Save Contest"}
          </button>
          {message ? <span className={state === "error" ? "status failed" : "subtle"}>{message}</span> : null}
        </div>
      </form>
    </section>
  );
}

function parseAssignments(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, problemSlug] = line.split(":").map((part) => part.trim());
      return { label, problemSlug };
    });
}

function toIso(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new Error("Date fields must be valid");
  }
  return new Date(timestamp).toISOString();
}

function optionalIso(value: string) {
  return value ? toIso(value) : undefined;
}
