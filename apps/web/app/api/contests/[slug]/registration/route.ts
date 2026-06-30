import { NextResponse } from "next/server";
import {
  countLocalContestRegistrations,
  isLocalContestRegistered,
  registerLocalContest,
  unregisterLocalContest,
} from "@/lib/local-contest-registrations";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  if (!hasSupabaseEnv()) {
    return NextResponse.json({
      registered: isLocalContestRegistered(slug),
      registeredCount: countLocalContestRegistrations(slug),
    });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const contest = await findContestId(supabase, slug);

  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  const { count } = await supabase
    .from("contest_registrations")
    .select("*", { count: "exact", head: true })
    .eq("contest_id", contest.id);

  if (!user) {
    return NextResponse.json({ registered: false, registeredCount: count ?? 0 });
  }

  const { data: registration } = await supabase
    .from("contest_registrations")
    .select("contest_id")
    .eq("contest_id", contest.id)
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    registered: Boolean(registration),
    registeredCount: count ?? 0,
  });
}

export async function POST(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  if (!hasSupabaseEnv()) {
    const registration = registerLocalContest(slug);
    return NextResponse.json(
      {
        registered: true,
        registeredAt: registration.registeredAt,
        registeredCount: countLocalContestRegistrations(slug),
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

  const contest = await findContestId(supabase, slug);
  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  const { error } = await supabase.from("contest_registrations").upsert(
    {
      contest_id: contest.id,
      user_id: user.id,
    },
    { ignoreDuplicates: true, onConflict: "contest_id,user_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ registered: true }, { status: 201 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  if (!hasSupabaseEnv()) {
    unregisterLocalContest(slug);
    return NextResponse.json({
      registered: false,
      registeredCount: countLocalContestRegistrations(slug),
    });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const contest = await findContestId(supabase, slug);
  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("contest_registrations")
    .delete()
    .eq("contest_id", contest.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ registered: false });
}

async function findContestId(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, slug: string) {
  const { data } = await supabase.from("contests").select("id").eq("slug", slug).eq("visibility", "public").single();
  return data;
}
