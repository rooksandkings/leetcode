import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CheckerType, ProblemSummary } from "@codearena/shared";
import { findRepoRoot } from "@/lib/local-judge";

export type LocalProblemDraft = {
  id: string;
  title: string;
  slug: string;
  difficulty: ProblemSummary["difficulty"];
  tags: string[];
  checker: CheckerType;
  timeLimitMs: number;
  memoryLimitMb: number;
  statement: string;
  manifest: string;
  status: "draft";
  createdAt: string;
  updatedAt: string;
};

type StoreShape = {
  drafts: LocalProblemDraft[];
};

export type ProblemDraftInput = {
  title: string;
  slug: string;
  difficulty: ProblemSummary["difficulty"];
  tags: string[];
  checker: CheckerType;
  timeLimitMs: number;
  memoryLimitMb: number;
  statement: string;
  manifest: string;
};

export function normalizeProblemDraftInput(input: unknown): ProblemDraftInput {
  const raw = input as Partial<ProblemDraftInput>;
  const title = stringField(raw.title, "Title");
  const slug = slugify(stringField(raw.slug, "Slug"));
  const difficulty = raw.difficulty === "easy" || raw.difficulty === "medium" || raw.difficulty === "hard" ? raw.difficulty : "medium";
  const checker = toChecker(raw.checker);
  const timeLimitMs = boundedInteger(raw.timeLimitMs, 100, 30000, 2000);
  const memoryLimitMb = boundedInteger(raw.memoryLimitMb, 16, 2048, 256);
  const statement = stringField(raw.statement, "Statement");
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 8) : [];
  const manifest = stringField(raw.manifest, "Package manifest");

  validateManifest(manifest, checker);

  return {
    title,
    slug,
    difficulty,
    tags,
    checker,
    timeLimitMs,
    memoryLimitMb,
    statement,
    manifest,
  };
}

export function saveLocalProblemDraft(input: ProblemDraftInput): LocalProblemDraft {
  const store = readStore();
  const now = new Date().toISOString();
  const existing = store.drafts.find((draft) => draft.slug === input.slug);
  const draft: LocalProblemDraft = {
    id: existing?.id ?? `draft_${Date.now()}`,
    ...input,
    status: "draft",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const drafts = [draft, ...store.drafts.filter((item) => item.slug !== input.slug)].slice(0, 100);
  writeStore({ drafts });
  return draft;
}

export function listLocalProblemDrafts(): LocalProblemDraft[] {
  return readStore().drafts;
}

function validateManifest(value: string, checker: CheckerType) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`Package manifest must be valid JSON: ${error instanceof Error ? error.message : "parse error"}`);
  }

  const manifest = parsed as {
    checker?: { type?: unknown };
    tests?: unknown;
  };

  if (!manifest.checker || manifest.checker.type !== checker) {
    throw new Error("Manifest checker.type must match the selected checker");
  }

  if (!Array.isArray(manifest.tests)) {
    throw new Error("Manifest must include a tests array");
  }
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
  return path.join(findRepoRoot(), ".local", "problem-drafts.json");
}

function stringField(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

function boundedInteger(value: unknown, min: number, max: number, fallback: number) {
  const numeric = typeof value === "number" ? value : Number(value ?? fallback);
  if (!Number.isInteger(numeric) || numeric < min || numeric > max) {
    throw new Error(`Value must be an integer between ${min} and ${max}`);
  }
  return numeric;
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

function toChecker(value: unknown): CheckerType {
  return value === "exact" || value === "line" || value === "token" || value === "float" || value === "custom" ? value : "token";
}

