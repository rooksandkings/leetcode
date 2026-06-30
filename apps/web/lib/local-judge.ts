import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { TestResult, Verdict } from "@codearena/shared";

const execFileAsync = promisify(execFile);

export type LocalJudgeResult = {
  verdict: Verdict;
  runtimeMs: number;
  memoryKb?: number;
  tests: TestResult[];
};

type JudgeCliResult = {
  finalVerdict: Verdict;
  runtimeMs: number;
  memoryKb: number | null;
  tests: Array<{
    name: string;
    visibility: "public" | "hidden";
    verdict: Verdict;
    runtimeMs: number;
    memoryKb: number | null;
    message: string;
  }>;
};

export function isLocalJudgeAllowed() {
  return process.env.LOCAL_JUDGE_ENABLED === "true" || process.env.NODE_ENV !== "production";
}

export async function judgeLocalSubmission(problemSlug: string, sourceCode: string): Promise<LocalJudgeResult> {
  if (!/^[a-z0-9-]+$/.test(problemSlug)) {
    throw new Error("Invalid problem slug");
  }

  const repoRoot = findRepoRoot();
  const problemPath = path.join(repoRoot, "problems", problemSlug);
  const cliPath = path.join(repoRoot, "apps", "judge-worker", "cli.py");

  if (!existsSync(problemPath)) {
    throw new Error("Problem package does not exist");
  }

  const runDir = await mkdtemp(path.join(tmpdir(), "codearena-web-"));
  const submissionPath = path.join(runDir, "submission.py");

  try {
    await writeFile(submissionPath, sourceCode, "utf-8");

    const stdout = await runJudgeCli(cliPath, problemPath, submissionPath);
    const parsed = JSON.parse(stdout) as JudgeCliResult;

    return {
      verdict: parsed.finalVerdict,
      runtimeMs: parsed.runtimeMs,
      memoryKb: parsed.memoryKb ?? undefined,
      tests: parsed.tests.map((test, index) => ({
        testIndex: index + 1,
        status: test.verdict,
        runtimeMs: test.runtimeMs,
        memoryKb: test.memoryKb ?? undefined,
        message: test.message,
        visibleToUser: test.visibility === "public",
      })),
    };
  } finally {
    await rm(runDir, { force: true, recursive: true });
  }
}

async function runJudgeCli(cliPath: string, problemPath: string, submissionPath: string) {
  const pythonBin = process.env.PYTHON_BIN ?? "python";

  try {
    const { stdout } = await execFileAsync(
      pythonBin,
      [cliPath, "judge", "--problem", problemPath, "--submission", submissionPath],
      {
        cwd: findRepoRoot(),
        maxBuffer: 2_000_000,
        timeout: 30_000,
      },
    );
    return stdout;
  } catch (error) {
    const maybeOutput = error as { stdout?: string; stderr?: string };
    if (maybeOutput.stdout?.trim()) {
      return maybeOutput.stdout;
    }

    throw new Error(maybeOutput.stderr?.trim() || "Local judge failed");
  }
}

export function findRepoRoot() {
  let current = process.cwd();

  for (let depth = 0; depth < 8; depth += 1) {
    if (
      existsSync(path.join(current, "package.json")) &&
      existsSync(path.join(current, "apps", "judge-worker")) &&
      existsSync(path.join(current, "problems"))
    ) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  throw new Error("Could not locate CodeArena repository root");
}
