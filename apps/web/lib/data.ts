import type { ContestSummary, ProblemSummary, StandingRow, SubmissionSummary } from "@codearena/shared";
import type { AdminContestRow } from "@/components/admin-contest-table";
import type { AdminProblemRow } from "@/components/admin-problem-table";
import type { LocalSubmissionRecord } from "@/lib/local-submissions";
import { contestEvents, contestProblems, contests, problems, submissions, type ProblemDetail } from "@/lib/mock-data";
import { isLocalContestSubmissionScoreable } from "@/lib/contest-submission-eligibility";
import { deriveStandings } from "@/lib/icpc";
import { listLocalContestDrafts } from "@/lib/local-contest-drafts";
import { countLocalContestRegistrations, listLocalContestRegistrations } from "@/lib/local-contest-registrations";
import { listLocalProblemDrafts } from "@/lib/local-problem-drafts";
import { getLocalSubmission, listLocalContestSubmissions, listLocalSubmissionSummaries } from "@/lib/local-submissions";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

type ContestProblem = {
  label: string;
  slug: string;
  title: string;
};

export type SubmissionDetail = SubmissionSummary & {
  contestSlug?: string;
  sourceCode?: string;
  tests: LocalSubmissionRecord["tests"];
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

export async function listAdminProblems(): Promise<AdminProblemRow[]> {
  if (!hasSupabaseEnv()) {
    const publishedRows: AdminProblemRow[] = problems.map((problem) => ({
      ...problem,
      status: "published",
    }));
    const draftRows: AdminProblemRow[] = listLocalProblemDrafts().map((draft) => ({
      slug: draft.slug,
      title: draft.title,
      difficulty: draft.difficulty,
      tags: draft.tags,
      acceptedCount: 0,
      submissionCount: 0,
      status: "draft",
      updatedAt: draft.updatedAt,
    }));
    return [...draftRows, ...publishedRows];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("problems")
    .select("slug,title,difficulty,tags,visibility,updated_at")
    .order("updated_at", { ascending: false });

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
    status: problem.visibility === "draft" ? "draft" : "published",
    updatedAt: String(problem.updated_at ?? ""),
  }));
}

export async function listAdminContests(): Promise<AdminContestRow[]> {
  if (!hasSupabaseEnv()) {
    const draftRows: AdminContestRow[] = listLocalContestDrafts().map((draft) => ({
      slug: draft.slug,
      title: draft.title,
      status: "draft",
      startsAt: draft.startsAt,
      endsAt: draft.endsAt,
      registrationClosesAt: draft.registrationClosesAt,
      problemCount: draft.problems.length,
      updatedAt: draft.updatedAt,
    }));
    const publishedRows: AdminContestRow[] = contests.map((contest) => ({
      slug: contest.slug,
      title: contest.title,
      status: "published",
      startsAt: contest.startsAt,
      endsAt: contest.endsAt,
      problemCount: contestProblems.length,
    }));
    return [...draftRows, ...publishedRows];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contests")
    .select("id,slug,title,starts_at,ends_at,registration_closes_at,visibility,updated_at")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const counts = await Promise.all(
    data.map(async (contest) => {
      const { count } = await supabase
        .from("contest_problems")
        .select("*", { count: "exact", head: true })
        .eq("contest_id", contest.id);
      return [String(contest.id), count ?? 0] as const;
    }),
  );
  const countByContestId = new Map(counts);

  return data.map((contest) => ({
    slug: String(contest.slug),
    title: String(contest.title),
    status: contest.visibility === "draft" ? "draft" : "published",
    startsAt: String(contest.starts_at),
    endsAt: String(contest.ends_at),
    registrationClosesAt: contest.registration_closes_at ? String(contest.registration_closes_at) : undefined,
    problemCount: countByContestId.get(String(contest.id)) ?? 0,
    updatedAt: String(contest.updated_at ?? ""),
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

export async function getContestProblem(contestSlug: string, problemSlug: string): Promise<ProblemDetail | undefined> {
  if (!hasSupabaseEnv()) {
    if (!contests.some((contest) => contest.slug === contestSlug)) {
      return undefined;
    }
    if (!contestProblems.some((problem) => problem.slug === problemSlug)) {
      return undefined;
    }
    return problems.find((problem) => problem.slug === problemSlug);
  }

  const supabase = await createSupabaseServerClient();
  const { data: contest, error: contestError } = await supabase
    .from("contests")
    .select("id")
    .eq("slug", contestSlug)
    .eq("visibility", "public")
    .single();

  if (contestError || !contest) {
    return undefined;
  }

  const { data: problem, error: problemError } = await supabase
    .from("problems")
    .select("id,slug,title,difficulty,tags")
    .eq("slug", problemSlug)
    .eq("visibility", "public")
    .single();

  if (problemError || !problem) {
    return undefined;
  }

  const { data: contestProblemRows, error: contestProblemsError } = await supabase
    .from("contest_problems")
    .select("problem_version_id")
    .eq("contest_id", contest.id);

  if (contestProblemsError || !contestProblemRows?.length) {
    return undefined;
  }

  const { data: version, error: versionError } = await supabase
    .from("problem_versions")
    .select("id,statement_md,time_limit_ms,memory_limit_mb,checker")
    .eq("problem_id", problem.id)
    .in(
      "id",
      contestProblemRows.map((row) => row.problem_version_id),
    )
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
    return contests.map((contest) => ({
      ...contest,
      registeredCount: contest.registeredCount + countLocalContestRegistrations(contest.slug),
    }));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contests")
    .select("id,slug,title,starts_at,ends_at,standings_frozen_at,standings_released_at")
    .eq("visibility", "public")
    .order("starts_at");

  if (error || !data) {
    return [];
  }

  const counts = await Promise.all(
    data.map(async (contest) => {
      const { count } = await supabase
        .from("contest_registrations")
        .select("*", { count: "exact", head: true })
        .eq("contest_id", contest.id);
      return [String(contest.id), count ?? 0] as const;
    }),
  );
  const countByContestId = new Map(counts);

  return data.map((contest) => ({
    slug: String(contest.slug),
    title: String(contest.title),
    startsAt: String(contest.starts_at),
    endsAt: String(contest.ends_at),
    standingsFrozenAt: contest.standings_frozen_at ? String(contest.standings_frozen_at) : undefined,
    standingsReleasedAt: contest.standings_released_at ? String(contest.standings_released_at) : undefined,
    registeredCount: countByContestId.get(String(contest.id)) ?? 0,
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
    const contest = contests.find((candidate) => candidate.slug === contestSlug);
    const visibleUntilMinute = localStandingsVisibleUntilMinute(contest);
    const localContestSubmissions = (await listLocalContestSubmissions(contestSlug)).filter(
      (submission) =>
        isLocalContestSubmissionScoreable(submission, contestSlug) && isLocalSubmissionVisibleOnStandings(submission, contest, visibleUntilMinute),
    );
    const localRegisteredHandles = listLocalContestRegistrations(contestSlug).map((registration) => registration.handle);
    const visibleContestEvents =
      visibleUntilMinute == null ? contestEvents : contestEvents.filter((event) => event.minute <= visibleUntilMinute);
    if (!localContestSubmissions.length && !localRegisteredHandles.length) {
      return deriveStandings(visibleContestEvents, labels);
    }

    const contestStartMs = contest ? new Date(contest.startsAt).getTime() : Date.now();
    const localEvents = localContestSubmissions.flatMap((submission) => {
      const problem = contestProblems.find((candidate) => candidate.slug === submission.problemSlug);
      if (!problem) {
        return [];
      }

      const rawMinute = Math.floor((new Date(submission.submittedAt).getTime() - contestStartMs) / 60000);
      return {
        handle: "local",
        problemLabel: problem.label,
        verdict: submission.verdict === "accepted" ? "accepted" : "wrong_answer",
        minute: Math.max(0, rawMinute),
      };
    });

    return deriveStandings([...visibleContestEvents, ...localEvents], labels, localRegisteredHandles);
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
    .select("rank,handle,solved_count,penalty_minutes,last_accepted_minute,problem_results")
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
    lastAcceptedMinute: row.last_accepted_minute == null ? null : Number(row.last_accepted_minute),
    problemResults: toProblemResults(row.problem_results),
  }));
}

export async function listRecentSubmissions(): Promise<SubmissionSummary[]> {
  if (!hasSupabaseEnv()) {
    const localSubmissions = await listLocalSubmissionSummaries();
    return localSubmissions.length ? localSubmissions : submissions;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("id,problem_version_id,verdict,language,runtime_ms,memory_kb,submitted_at")
    .order("submitted_at", { ascending: false })
    .limit(10);

  if (error || !data) {
    return [];
  }

  const problemTitles = await problemTitlesByVersionIds(data.map((submission) => submission.problem_version_id));

  return data.map((submission) => {
    const problem = problemTitles.get(String(submission.problem_version_id));
    return {
      id: String(submission.id),
      problemSlug: problem?.slug ?? "unknown",
      problemTitle: problem?.title ?? "Unknown Problem",
      verdict: toVerdict(submission.verdict),
      language: "python3",
      runtimeMs: Number(submission.runtime_ms ?? 0),
      memoryKb: submission.memory_kb == null ? undefined : Number(submission.memory_kb),
      submittedAt: String(submission.submitted_at),
    };
  });
}

export async function getSubmissionDetail(id: string): Promise<SubmissionDetail | undefined> {
  if (!hasSupabaseEnv()) {
    const local = await getLocalSubmission(id);
    if (!local) {
      const mock = submissions.find((submission) => submission.id === id);
      return mock ? { ...mock, tests: [] } : undefined;
    }

    return {
      id: local.id,
      problemSlug: local.problemSlug,
      problemTitle: local.problemTitle,
      verdict: local.verdict,
      contestSlug: local.contestSlug,
      language: local.language,
      runtimeMs: local.runtimeMs,
      memoryKb: local.memoryKb,
      submittedAt: local.submittedAt,
      sourceCode: local.sourceCode,
      tests: local.tests,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("id,problem_version_id,verdict,language,source_code,runtime_ms,memory_kb,submitted_at")
    .eq("id", id)
    .single();

  if (submissionError || !submission) {
    return undefined;
  }

  const problemTitles = await problemTitlesByVersionIds([submission.problem_version_id]);
  const problem = problemTitles.get(String(submission.problem_version_id));
  const { data: tests } = await supabase
    .from("submission_test_results")
    .select("test_index,visibility,verdict,runtime_ms,memory_kb,message_public")
    .eq("submission_id", id)
    .order("test_index");

  return {
    id: String(submission.id),
    problemSlug: problem?.slug ?? "unknown",
    problemTitle: problem?.title ?? "Unknown Problem",
    verdict: toVerdict(submission.verdict),
    language: "python3",
    runtimeMs: Number(submission.runtime_ms ?? 0),
    memoryKb: submission.memory_kb == null ? undefined : Number(submission.memory_kb),
    submittedAt: String(submission.submitted_at),
    sourceCode: String(submission.source_code),
    tests: (tests ?? []).map((test) => ({
      testIndex: Number(test.test_index),
      status: toVerdict(test.verdict),
      runtimeMs: Number(test.runtime_ms ?? 0),
      memoryKb: test.memory_kb == null ? undefined : Number(test.memory_kb),
      message: String(test.message_public ?? ""),
      visibleToUser: test.visibility === "public",
    })),
  };
}

function toDifficulty(value: unknown): ProblemSummary["difficulty"] {
  return value === "hard" || value === "medium" || value === "easy" ? value : "medium";
}

function toChecker(value: unknown): ProblemDetail["checker"] {
  return value === "exact" || value === "line" || value === "token" || value === "float" || value === "custom"
    ? value
    : "token";
}

function toVerdict(value: unknown): SubmissionSummary["verdict"] {
  return value === "queued" ||
    value === "compiling" ||
    value === "running" ||
    value === "accepted" ||
    value === "wrong_answer" ||
    value === "time_limit_exceeded" ||
    value === "memory_limit_exceeded" ||
    value === "runtime_error" ||
    value === "compilation_error" ||
    value === "output_limit_exceeded" ||
    value === "judge_error"
    ? value
    : "judge_error";
}

function toProblemResults(value: unknown): StandingRow["problemResults"] {
  const results: StandingRow["problemResults"] = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return results;
  }

  for (const [label, rawResult] of Object.entries(value as Record<string, unknown>)) {
    if (!rawResult || typeof rawResult !== "object" || Array.isArray(rawResult)) {
      continue;
    }

    const result = rawResult as Record<string, unknown>;
    results[label] = {
      solved: Boolean(result.solved),
      attemptsBeforeSolve: Number(result.attemptsBeforeSolve ?? 0),
      penaltyMinutes: Number(result.penaltyMinutes ?? 0),
    };
  }

  return results;
}

function localStandingsVisibleUntilMinute(contest: ContestSummary | undefined) {
  if (!contest?.standingsFrozenAt) {
    return null;
  }

  const now = Date.now();
  const frozenAt = new Date(contest.standingsFrozenAt).getTime();
  const releasedAt = contest.standingsReleasedAt ? new Date(contest.standingsReleasedAt).getTime() : Number.POSITIVE_INFINITY;
  if (now < frozenAt || now >= releasedAt) {
    return null;
  }

  return Math.max(0, Math.floor((frozenAt - new Date(contest.startsAt).getTime()) / 60000));
}

function isLocalSubmissionVisibleOnStandings(
  submission: LocalSubmissionRecord,
  contest: ContestSummary | undefined,
  visibleUntilMinute: number | null,
) {
  if (!contest || visibleUntilMinute == null) {
    return true;
  }

  const minute = Math.floor((new Date(submission.submittedAt).getTime() - new Date(contest.startsAt).getTime()) / 60000);
  return minute <= visibleUntilMinute;
}

async function problemTitlesByVersionIds(versionIds: unknown[]) {
  const supabase = await createSupabaseServerClient();
  const normalizedVersionIds = versionIds.map(String);
  const results = new Map<string, { slug: string; title: string }>();
  if (!normalizedVersionIds.length) {
    return results;
  }

  const { data: versions, error: versionsError } = await supabase
    .from("problem_versions")
    .select("id,problem_id")
    .in("id", normalizedVersionIds);

  if (versionsError || !versions?.length) {
    return results;
  }

  const { data: problemRows, error: problemsError } = await supabase
    .from("problems")
    .select("id,slug,title")
    .in(
      "id",
      versions.map((version) => version.problem_id),
    );

  if (problemsError || !problemRows?.length) {
    return results;
  }

  for (const version of versions) {
    const problem = problemRows.find((candidate) => candidate.id === version.problem_id);
    if (problem) {
      results.set(String(version.id), {
        slug: String(problem.slug),
        title: String(problem.title),
      });
    }
  }

  return results;
}
