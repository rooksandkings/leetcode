import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { isLocalJudgeAllowed } from "@/lib/local-judge";
import { recordLocalPackageArtifact } from "@/lib/local-package-verifications";
import {
  storeVerifiedProblemPackageArchive,
  storeVerifiedProblemPackagePath,
  type StoredPackageArtifact,
} from "@/lib/package-verification";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bucket = "problem-packages";

export async function POST(request: Request) {
  if (!isLocalJudgeAllowed()) {
    return NextResponse.json({ error: "Package storage is disabled" }, { status: 503 });
  }

  const supabase = hasSupabaseEnv() ? await createSupabaseServerClient() : null;
  if (supabase) {
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
    const artifact = await storedArtifactFromRequest(request);

    if (supabase) {
      const bytes = await readFile(artifact.localPath);
      const { error } = await supabase.storage.from(bucket).upload(artifact.storagePath, bytes, {
        contentType: "application/zip",
        upsert: true,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ artifact: responseArtifact(artifact, false) }, { status: 201 });
    }

    const stored = recordLocalPackageArtifact(artifact);
    return NextResponse.json({ artifact: responseArtifact(stored, true) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Package storage failed" }, { status: 400 });
  }
}

async function storedArtifactFromRequest(request: Request): Promise<StoredPackageArtifact> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("package");
    if (!(file instanceof File)) {
      throw new Error("Package archive is required");
    }
    return storeVerifiedProblemPackageArchive(file);
  }

  const body = (await request.json()) as { packagePath?: string };
  if (!body.packagePath) {
    throw new Error("packagePath is required");
  }
  return storeVerifiedProblemPackagePath(body.packagePath);
}

function responseArtifact(artifact: StoredPackageArtifact & { id?: string; storedAt?: string }, includeLocalPath: boolean) {
  return {
    id: artifact.id,
    source: artifact.source,
    storagePath: artifact.storagePath,
    localPath: includeLocalPath ? artifact.localPath : undefined,
    checksumSha256: artifact.checksumSha256,
    sizeBytes: artifact.sizeBytes,
    storedAt: artifact.storedAt,
    report: artifact.report,
  };
}
