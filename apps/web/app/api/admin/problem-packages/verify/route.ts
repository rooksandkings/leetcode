import { NextResponse } from "next/server";
import { isLocalJudgeAllowed } from "@/lib/local-judge";
import { recordLocalPackageVerification } from "@/lib/local-package-verifications";
import { verifyProblemPackageArchive, verifyProblemPackagePath } from "@/lib/package-verification";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isLocalJudgeAllowed()) {
    return NextResponse.json({ error: "Package verification is disabled" }, { status: 503 });
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

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("package");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Package archive is required" }, { status: 400 });
      }

      const report = await verifyProblemPackageArchive(file);
      const verification = !hasSupabaseEnv() ? recordLocalPackageVerification(file.name, report) : undefined;
      return NextResponse.json({ report, verification });
    }

    const body = (await request.json()) as { packagePath?: string };
    if (!body.packagePath) {
      return NextResponse.json({ error: "packagePath is required" }, { status: 400 });
    }

    const report = await verifyProblemPackagePath(body.packagePath);
    const verification = !hasSupabaseEnv() ? recordLocalPackageVerification(body.packagePath, report) : undefined;
    return NextResponse.json({ report, verification });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Package verification failed" }, { status: 400 });
  }
}
