import { NextResponse } from "next/server";
import { normalizeProblemDraftInput, saveLocalProblemDraft } from "@/lib/local-problem-drafts";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let input;
  try {
    input = normalizeProblemDraftInput(await request.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid problem draft" }, { status: 400 });
  }

  if (!hasSupabaseEnv()) {
    const draft = saveLocalProblemDraft(input);
    return NextResponse.json(draft, { status: 201 });
  }

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
    .insert({
      slug: input.slug,
      title: input.title,
      difficulty: input.difficulty,
      tags: input.tags,
      visibility: "draft",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (problemError || !problem) {
    return NextResponse.json({ error: problemError?.message ?? "Problem insert failed" }, { status: 400 });
  }

  const { data: version, error: versionError } = await supabase
    .from("problem_versions")
    .insert({
      problem_id: problem.id,
      version: 1,
      statement_md: input.statement,
      time_limit_ms: input.timeLimitMs,
      memory_limit_mb: input.memoryLimitMb,
      checker: input.checker,
      checker_config: JSON.parse(input.manifest).checker ?? {},
      created_by: user.id,
    })
    .select("id")
    .single();

  if (versionError || !version) {
    return NextResponse.json({ error: versionError?.message ?? "Problem version insert failed" }, { status: 400 });
  }

  await supabase.from("problems").update({ current_version_id: version.id }).eq("id", problem.id);

  return NextResponse.json(
    {
      id: problem.id,
      title: input.title,
      slug: input.slug,
      status: "draft",
    },
    { status: 201 },
  );
}

