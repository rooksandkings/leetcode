import { NextResponse } from "next/server";
import { normalizeContestDraftInput, saveLocalContestDraft } from "@/lib/local-contest-drafts";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let input;
  try {
    input = normalizeContestDraftInput(await request.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid contest draft" }, { status: 400 });
  }

  if (!hasSupabaseEnv()) {
    const draft = saveLocalContestDraft(input);
    return NextResponse.json(
      {
        ...draft,
        problemCount: draft.problems.length,
      },
      { status: 201 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: contestId, error } = await supabase.rpc("create_admin_contest", {
    p_title: input.title,
    p_slug: input.slug,
    p_description: input.description ?? null,
    p_registration_opens_at: input.registrationOpensAt ?? null,
    p_registration_closes_at: input.registrationClosesAt ?? null,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_standings_frozen_at: input.standingsFrozenAt ?? null,
    p_standings_released_at: input.standingsReleasedAt ?? null,
    p_assignments: input.problems,
  });

  if (error || !contestId) {
    return NextResponse.json({ error: error?.message ?? "Contest insert failed" }, { status: 400 });
  }

  return NextResponse.json(
    {
      id: contestId,
      title: input.title,
      slug: input.slug,
      status: "draft",
      problemCount: input.problems.length,
    },
    { status: 201 },
  );
}
