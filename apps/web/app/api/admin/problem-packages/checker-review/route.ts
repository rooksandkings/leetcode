import { NextResponse } from "next/server";
import {
  normalizeCheckerReviewInput,
  recordLocalCheckerReview,
  type CheckerReviewInput,
} from "@/lib/local-checker-reviews";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let input: CheckerReviewInput;
  try {
    input = normalizeCheckerReviewInput(await request.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid checker review" }, { status: 400 });
  }

  if (!hasSupabaseEnv()) {
    return NextResponse.json({ review: recordLocalCheckerReview(input) }, { status: 201 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { data: review, error } = await supabase
    .from("custom_checker_reviews")
    .upsert(
      {
        storage_path: input.storagePath,
        checksum_sha256: input.checksumSha256,
        package_slug: input.packageSlug,
        has_custom_checker: input.hasCustomChecker,
        status: input.status,
        notes: input.notes,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      },
      { onConflict: "storage_path" },
    )
    .select("id,storage_path,status,notes,reviewed_at")
    .single();

  if (error || !review) {
    return NextResponse.json({ error: error?.message ?? "Checker review save failed" }, { status: 400 });
  }

  return NextResponse.json({ review }, { status: 201 });
}
