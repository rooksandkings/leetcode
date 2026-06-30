import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { SubmissionSummary, TestResult, Verdict } from "@codearena/shared";
import { findRepoRoot } from "@/lib/local-judge";
import { problems } from "@/lib/mock-data";

export type LocalSubmissionRecord = {
  id: string;
  problemSlug: string;
  problemTitle: string;
  contestSlug?: string;
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
  const store = readStore();
  const submissions = [record, ...store.submissions.filter((submission) => submission.id !== record.id)].slice(0, 100);
  writeStore({ submissions });
}

export async function getLocalSubmission(id: string): Promise<LocalSubmissionRecord | undefined> {
  const store = readStore();
  return store.submissions.find((submission) => submission.id === id);
}

export async function listLocalSubmissionSummaries(limit = 10): Promise<SubmissionSummary[]> {
  const store = readStore();
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

export async function listLocalContestSubmissions(contestSlug: string): Promise<LocalSubmissionRecord[]> {
  const store = readStore();
  return store.submissions.filter((submission) => submission.contestSlug === contestSlug);
}

export function problemTitleForSlug(slug: string) {
  return problems.find((problem) => problem.slug === slug)?.title ?? slug;
}

function readStore(): StoreShape {
  const storePath = localStorePath();
  if (!existsSync(storePath)) {
    return { submissions: [] };
  }

  const raw = readFileSync(storePath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<StoreShape>;
  return {
    submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
  };
}

function writeStore(store: StoreShape) {
  const storePath = localStorePath();
  mkdirSync(path.dirname(storePath), { recursive: true });
  writeFileSync(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
}

function localStorePath() {
  return path.join(findRepoRoot(), ".local", "submissions.json");
}
