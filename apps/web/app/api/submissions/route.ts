import { NextResponse } from "next/server";
import { assertLocalContestSubmissionAllowed, ContestSubmissionEligibilityError } from "@/lib/contest-submission-eligibility";
import { isLocalJudgeAllowed, judgeLocalSubmission } from "@/lib/local-judge";
import { problemTitleForSlug, recordLocalSubmission } from "@/lib/local-submissions";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    problemSlug?: string;
    contestId?: unknown;
    contestSlug?: string;
    language?: string;
    sourceCode?: string;
  };

  if (body.contestId) {
    return NextResponse.json({ error: "Use contestSlug for contest submissions" }, { status: 400 });
  }

  if (
    typeof body.problemSlug !== "string" ||
    typeof body.sourceCode !== "string" ||
    !body.problemSlug ||
    body.language !== "python3" ||
    !body.sourceCode.trim()
  ) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  if (hasSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: problem, error: problemError } = await supabase
      .from("problems")
      .select("id,current_version_id")
      .eq("slug", body.problemSlug)
      .eq("visibility", "public")
      .single();

    if (problemError || !problem?.current_version_id) {
      return NextResponse.json({ error: "Problem is not available" }, { status: 404 });
    }

    let contestId: string | null = null;
    let problemVersionId = problem.current_version_id;
    if (body.contestSlug) {
      const { data: contest, error: contestError } = await supabase
        .from("contests")
        .select("id,starts_at,ends_at")
        .eq("slug", body.contestSlug)
        .eq("visibility", "public")
        .single();

      if (contestError || !contest) {
        return NextResponse.json({ error: "Contest is not available" }, { status: 404 });
      }

      const { data: contestProblems, error: contestProblemsError } = await supabase
        .from("contest_problems")
        .select("problem_version_id")
        .eq("contest_id", contest.id);

      if (contestProblemsError || !contestProblems?.length) {
        return NextResponse.json({ error: "Contest problem is not available" }, { status: 404 });
      }

      const versionIds = contestProblems.map((candidate) => candidate.problem_version_id);
      const { data: contestVersion, error: contestVersionError } = await supabase
        .from("problem_versions")
        .select("id")
        .eq("problem_id", problem.id)
        .in("id", versionIds)
        .single();

      if (contestVersionError || !contestVersion) {
        return NextResponse.json({ error: "Problem is not in this contest" }, { status: 400 });
      }

      contestId = String(contest.id);
      problemVersionId = contestVersion.id;
    }

    const { data: submissionId, error: submitError } = await supabase.rpc("submit_solution", {
      p_problem_version_id: problemVersionId,
      p_contest_id: contestId,
      p_source_code: body.sourceCode,
    });

    if (submitError) {
      return NextResponse.json({ error: submitError.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        id: submissionId,
        status: "queued",
        problemSlug: body.problemSlug,
      },
      { status: 201 },
    );
  }

  if (!isLocalJudgeAllowed()) {
    return NextResponse.json({ error: "Local judge is disabled" }, { status: 503 });
  }

  try {
    assertLocalContestSubmissionAllowed(body.contestSlug, body.problemSlug);
    const result = await judgeLocalSubmission(body.problemSlug, body.sourceCode);
    const id = `local_${Date.now()}`;
    await recordLocalSubmission({
      id,
      problemSlug: body.problemSlug,
      problemTitle: problemTitleForSlug(body.problemSlug),
      contestSlug: body.contestSlug,
      language: "python3",
      sourceCode: body.sourceCode,
      verdict: result.verdict,
      runtimeMs: result.runtimeMs,
      memoryKb: result.memoryKb,
      submittedAt: new Date().toISOString(),
      tests: result.tests,
    });

    return NextResponse.json(
      {
        id,
        status: "done",
        problemSlug: body.problemSlug,
        ...result,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ContestSubmissionEligibilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Local judge failed",
      },
      { status: 500 },
    );
  }
}
