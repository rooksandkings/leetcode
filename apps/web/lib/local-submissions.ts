import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SubmissionSummary, TestResult, Verdict } from "@codearena/shared";
import { findRepoRoot } from "@/lib/local-judge";
import { problems } from "@/lib/mock-data";

export type LocalSubmissionRecord = {
  id: string;
  problemSlug: string;
  problemTitle: string;
  language: "python3";
  sourceCode: string;
  verdict: Verdict;
  runtimeMs: number;
  memoryKb?: number;
  submittedAt: string;
  tests: TestResult[];
};

type StoreShape = {
  submissions: LocalSubmissionRecord[];
};

export async function recordLocalSubmission(record: LocalSubmissionRecord) {
  const store = await readStore();
  const submissions = [record, ...store.submissions.filter((submission) => submission.id !== record.id)].slice(0, 100);
  await writeStore({ submissions });
}

export async function getLocalSubmission(id: string): Promise<LocalSubmissionRecord | undefined> {
  const store = await readStore();
  return store.submissions.find((submission) => submission.id === id);
}

export async function listLocalSubmissionSummaries(limit = 10): Promise<SubmissionSummary[]> {
  const store = await readStore();
  return store.submissions.slice(0, limit).map((submission) => ({
    id: submission.id,
    problemSlug: submission.problemSlug,
    problemTitle: submission.problemTitle,
    verdict: submission.verdict,
    language: submission.language,
    runtimeMs: submission.runtimeMs,
    memoryKb: submission.memoryKb,
    submittedAt: submission.submittedAt,
  }));
}

export function problemTitleForSlug(slug: string) {
  return problems.find((problem) => problem.slug === slug)?.title ?? slug;
}

async function readStore(): Promise<StoreShape> {
  const storePath = localStorePath();
  if (!existsSync(storePath)) {
    return { submissions: [] };
  }

  const raw = await readFile(storePath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<StoreShape>;
  return {
    submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
  };
}

async function writeStore(store: StoreShape) {
  const storePath = localStorePath();
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
}

function localStorePath() {
  return path.join(findRepoRoot(), ".local", "submissions.json");
}

