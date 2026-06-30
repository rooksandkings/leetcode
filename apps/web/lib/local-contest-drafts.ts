import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { findRepoRoot } from "@/lib/local-judge";

export type ContestProblemAssignment = {
  label: string;
  problemSlug: string;
};

export type LocalContestDraft = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  standingsFrozenAt?: string;
  standingsReleasedAt?: string;
  problems: ContestProblemAssignment[];
  status: "draft";
  createdAt: string;
  updatedAt: string;
};

export type ContestDraftInput = {
  title: string;
  slug: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  standingsFrozenAt?: string;
  standingsReleasedAt?: string;
  problems: ContestProblemAssignment[];
};

type StoreShape = {
  drafts: LocalContestDraft[];
};

export function normalizeContestDraftInput(input: unknown): ContestDraftInput {
  const raw = input as Partial<ContestDraftInput>;
  const title = stringField(raw.title, "Title");
  const slug = slugify(stringField(raw.slug, "Slug"));
  const description = optionalStringField(raw.description);
  const startsAt = dateField(raw.startsAt, "Start time");
  const endsAt = dateField(raw.endsAt, "End time");
  const registrationOpensAt = optionalDateField(raw.registrationOpensAt, "Registration open time");
  const registrationClosesAt = optionalDateField(raw.registrationClosesAt, "Registration close time");
  const standingsFrozenAt = optionalDateField(raw.standingsFrozenAt, "Standings freeze time");
  const standingsReleasedAt = optionalDateField(raw.standingsReleasedAt, "Standings release time");
  const problems = normalizeAssignments(raw.problems);

  const startMs = Date.parse(startsAt);
  const endMs = Date.parse(endsAt);
  if (endMs <= startMs) {
    throw new Error("End time must be after start time");
  }

  if (registrationOpensAt && Date.parse(registrationOpensAt) > startMs) {
    throw new Error("Registration open time must be before contest start");
  }
  if (registrationClosesAt && Date.parse(registrationClosesAt) > startMs) {
    throw new Error("Registration close time must be before contest start");
  }
  if (registrationOpensAt && registrationClosesAt && Date.parse(registrationOpensAt) > Date.parse(registrationClosesAt)) {
    throw new Error("Registration open time must be before registration close time");
  }
  if (standingsFrozenAt) {
    const frozenMs = Date.parse(standingsFrozenAt);
    if (frozenMs < startMs || frozenMs > endMs) {
      throw new Error("Standings freeze time must be inside the contest window");
    }
  }
  if (standingsReleasedAt && Date.parse(standingsReleasedAt) < startMs) {
    throw new Error("Standings release time must be after contest start");
  }

  return {
    title,
    slug,
    description,
    startsAt,
    endsAt,
    registrationOpensAt,
    registrationClosesAt,
    standingsFrozenAt,
    standingsReleasedAt,
    problems,
  };
}

export function saveLocalContestDraft(input: ContestDraftInput): LocalContestDraft {
  const store = readStore();
  const now = new Date().toISOString();
  const existing = store.drafts.find((draft) => draft.slug === input.slug);
  const draft: LocalContestDraft = {
    id: existing?.id ?? `contest_${Date.now()}`,
    ...input,
    status: "draft",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const drafts = [draft, ...store.drafts.filter((item) => item.slug !== input.slug)].slice(0, 100);
  writeStore({ drafts });
  return draft;
}

export function listLocalContestDrafts(): LocalContestDraft[] {
  return readStore().drafts;
}

function normalizeAssignments(value: unknown): ContestProblemAssignment[] {
  if (!Array.isArray(value) || !value.length) {
    throw new Error("At least one contest problem assignment is required");
  }

  const labels = new Set<string>();
  const problemSlugs = new Set<string>();
  return value.map((item, index) => {
    const raw = item as Partial<ContestProblemAssignment>;
    const label = stringField(raw.label, `Problem ${index + 1} label`).toUpperCase();
    if (!/^[A-Z][A-Z0-9]{0,3}$/.test(label)) {
      throw new Error("Problem labels must look like A, B, C, or A1");
    }
    if (labels.has(label)) {
      throw new Error(`Duplicate problem label: ${label}`);
    }
    labels.add(label);

    const problemSlug = slugify(stringField(raw.problemSlug, `Problem ${label} slug`));
    if (problemSlugs.has(problemSlug)) {
      throw new Error(`Duplicate problem slug: ${problemSlug}`);
    }
    problemSlugs.add(problemSlug);

    return { label, problemSlug };
  });
}

function readStore(): StoreShape {
  const storePath = localStorePath();
  if (!existsSync(storePath)) {
    return { drafts: [] };
  }

  const raw = readFileSync(storePath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<StoreShape>;
  return {
    drafts: Array.isArray(parsed.drafts) ? parsed.drafts : [],
  };
}

function writeStore(store: StoreShape) {
  const storePath = localStorePath();
  mkdirSync(path.dirname(storePath), { recursive: true });
  writeFileSync(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
}

function localStorePath() {
  return path.join(findRepoRoot(), ".local", "contest-drafts.json");
}

function stringField(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

function optionalStringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function dateField(value: unknown, label: string) {
  const raw = stringField(value, label);
  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) {
    throw new Error(`${label} must be a valid date`);
  }
  return new Date(timestamp).toISOString();
}

function optionalDateField(value: unknown, label: string) {
  if (value == null || value === "") {
    return undefined;
  }
  return dateField(value, label);
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (!slug) {
    throw new Error("Slug must include letters or numbers");
  }

  return slug;
}
