import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    problemSlug?: string;
    contestId?: string;
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

    const { data: submissionId, error: submitError } = await supabase.rpc("submit_solution", {
      p_problem_version_id: problem.current_version_id,
      p_contest_id: body.contestId ?? null,
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

  return NextResponse.json(
    {
      id: `local_${Date.now()}`,
      status: "queued",
      problemSlug: body.problemSlug,
    },
    { status: 201 },
  );
}
