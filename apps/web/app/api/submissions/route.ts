import { NextResponse } from "next/server";
import { isLocalJudgeAllowed, judgeLocalSubmission } from "@/lib/local-judge";
import { problemTitleForSlug, recordLocalSubmission } from "@/lib/local-submissions";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    problemSlug?: string;
    contestId?: string;
    contestSlug?: string;
    language?: string;
    sourceCode?: string;
  };

  if (!body.problemSlug || body.language !== "python3" || !body.sourceCode?.trim()) {
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
      .select("current_version_id")
      .eq("slug", body.problemSlug)
      .eq("visibility", "public")
      .single();

    if (problemError || !problem?.current_version_id) {
      return NextResponse.json({ error: "Problem is not available" }, { status: 404 });
    }

    let contestId = body.contestId ?? null;
    if (!contestId && body.contestSlug) {
      const { data: contest } = await supabase
        .from("contests")
        .select("id")
        .eq("slug", body.contestSlug)
        .eq("visibility", "public")
        .single();
      contestId = contest?.id ?? null;
    }

    const { data: submissionId, error: submitError } = await supabase.rpc("submit_solution", {
      p_problem_version_id: problem.current_version_id,
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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Local judge failed",
      },
      { status: 500 },
    );
  }
}
