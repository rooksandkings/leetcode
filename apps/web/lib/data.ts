import type { ContestSummary, ProblemSummary, StandingRow, SubmissionSummary } from "@codearena/shared";
import { contestEvents, contestProblems, contests, problems, submissions, type ProblemDetail } from "@/lib/mock-data";
import { deriveStandings } from "@/lib/icpc";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

type ContestProblem = {
  label: string;
  slug: string;
  title: string;
};

export async function listProblems(): Promise<ProblemSummary[]> {
  if (!hasSupabaseEnv()) {
    return problems;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("problems")
    .select("slug,title,difficulty,tags")
    .eq("visibility", "public")
    .order("slug");

  if (error || !data) {
    return [];
  }

  return data.map((problem) => ({
    slug: String(problem.slug),
    title: String(problem.title),
    difficulty: toDifficulty(problem.difficulty),
    tags: Array.isArray(problem.tags) ? problem.tags.map(String) : [],
    acceptedCount: 0,
    submissionCount: 0,
  }));
}

export async function getProblem(slug: string): Promise<ProblemDetail | undefined> {
  if (!hasSupabaseEnv()) {
    return problems.find((problem) => problem.slug === slug);
  }

  const supabase = await createSupabaseServerClient();
  const { data: problem, error: problemError } = await supabase
    .from("problems")
    .select("id,slug,title,difficulty,tags,current_version_id")
    .eq("slug", slug)
    .eq("visibility", "public")
    .single();

  if (problemError || !problem?.current_version_id) {
    return undefined;
  }

  const { data: version, error: versionError } = await supabase
    .from("problem_versions")
    .select("statement_md,time_limit_ms,memory_limit_mb,checker")
    .eq("id", problem.current_version_id)
    .single();

  if (versionError || !version) {
    return undefined;
  }

  return {
    slug: String(problem.slug),
    title: String(problem.title),
    difficulty: toDifficulty(problem.difficulty),
    tags: Array.isArray(problem.tags) ? problem.tags.map(String) : [],
    acceptedCount: 0,
    submissionCount: 0,
    checker: toChecker(version.checker),
    timeLimitMs: Number(version.time_limit_ms),
    memoryLimitMb: Number(version.memory_limit_mb),
    statement: String(version.statement_md),
    input: "See the problem statement.",
    output: "See the problem statement.",
    constraints: [],
    samples: [],
  };
}

export async function listContests(): Promise<ContestSummary[]> {
  if (!hasSupabaseEnv()) {
    return contests;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contests")
    .select("slug,title,starts_at,ends_at")
    .eq("visibility", "public")
    .order("starts_at");

  if (error || !data) {
    return [];
  }

  return data.map((contest) => ({
    slug: String(contest.slug),
    title: String(contest.title),
    startsAt: String(contest.starts_at),
    endsAt: String(contest.ends_at),
    registeredCount: 0,
  }));
}

export async function getContest(slug: string): Promise<ContestSummary | undefined> {
  const allContests = await listContests();
  return allContests.find((contest) => contest.slug === slug);
}

export async function listContestProblems(contestSlug: string): Promise<ContestProblem[]> {
  if (!hasSupabaseEnv()) {
    return contestProblems;
  }

  const supabase = await createSupabaseServerClient();
  const { data: contest, error: contestError } = await supabase
    .from("contests")
    .select("id")
    .eq("slug", contestSlug)
    .eq("visibility", "public")
    .single();

  if (contestError || !contest) {
    return [];
  }

  const { data: contestProblemRows, error: contestProblemsError } = await supabase
    .from("contest_problems")
    .select("label,problem_version_id")
    .eq("contest_id", contest.id)
    .order("display_order");

  if (contestProblemsError || !contestProblemRows?.length) {
    return [];
  }

  const versionIds = contestProblemRows.map((row) => row.problem_version_id);
  const { data: versions, error: versionsError } = await supabase
    .from("problem_versions")
    .select("id,problem_id")
    .in("id", versionIds);

  if (versionsError || !versions?.length) {
    return [];
  }

  const problemIds = versions.map((version) => version.problem_id);
  const { data: problemRows, error: problemsError } = await supabase
    .from("problems")
    .select("id,slug,title")
    .in("id", problemIds);

  if (problemsError || !problemRows?.length) {
    return [];
  }

  return contestProblemRows.flatMap((row) => {
    const version = versions.find((candidate) => candidate.id === row.problem_version_id);
    const problem = problemRows.find((candidate) => candidate.id === version?.problem_id);
    if (!problem) {
      return [];
    }

    return {
      label: String(row.label),
      slug: String(problem.slug),
      title: String(problem.title),
    };
  });
}

export async function getStandings(contestSlug: string, labels: string[]): Promise<StandingRow[]> {
  if (!hasSupabaseEnv()) {
    return deriveStandings(contestEvents, labels);
  }

  const supabase = await createSupabaseServerClient();
  const { data: contest, error: contestError } = await supabase
    .from("contests")
    .select("id")
    .eq("slug", contestSlug)
    .eq("visibility", "public")
    .single();

  if (contestError || !contest) {
    return [];
  }

  const { data, error } = await supabase
    .from("contest_standings")
    .select("rank,handle,solved_count,penalty_minutes,last_accepted_at")
    .eq("contest_id", contest.id)
    .order("rank");

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    rank: Number(row.rank),
    handle: String(row.handle),
    solved: Number(row.solved_count),
    penaltyMinutes: Number(row.penalty_minutes),
    lastAcceptedMinute: row.last_accepted_at ? 0 : null,
    problemResults: {},
  }));
}

export function listRecentSubmissions(): SubmissionSummary[] {
  return submissions;
}

function toDifficulty(value: unknown): ProblemSummary["difficulty"] {
  return value === "hard" || value === "medium" || value === "easy" ? value : "medium";
}

function toChecker(value: unknown): ProblemDetail["checker"] {
  return value === "exact" || value === "line" || value === "token" || value === "float" || value === "custom"
    ? value
    : "token";
}

