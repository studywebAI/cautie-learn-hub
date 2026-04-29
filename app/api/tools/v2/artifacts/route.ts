import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { CanonicalDocument } from "@/lib/tools/canonical-model";
import { getAuthedToolboxContext } from "@/lib/toolbox/server";

const CreateArtifactSchema = z.object({
  artifactId: z.string().uuid().optional(),
  toolId: z.string().min(1),
  artifactType: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.any(),
  metadata: z.record(z.any()).optional(),
});

function extractCanonical(content: any, metadata?: Record<string, any> | undefined): CanonicalDocument | null {
  const fromContent = content?.canonical_v1;
  const fromMetadata = metadata?.canonical_v1;
  const candidate = fromContent && typeof fromContent === "object" ? fromContent : fromMetadata;
  if (!candidate || typeof candidate !== "object") return null;
  return candidate as CanonicalDocument;
}

function normalizePayload(content: any, metadata?: Record<string, any>) {
  const canonical = extractCanonical(content, metadata);
  if (!canonical) {
    return {
      content,
      metadata: metadata || {},
    };
  }

  const nextContent = {
    ...(content && typeof content === "object" ? content : { value: content }),
    format: "canonical_v1",
    canonical_v1: canonical,
  };

  return {
    content: nextContent,
    metadata: {
      ...(metadata || {}),
      canonical_v1: canonical,
      payload_format: "canonical_v1",
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedToolboxContext();
    const payload = CreateArtifactSchema.parse(await request.json());
    const normalized = normalizePayload(payload.content, payload.metadata);

    if (payload.artifactId) {
      const { data: existing } = await supabase
        .from("artifacts")
        .select("*")
        .eq("id", payload.artifactId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
      }

      const nextVersion = (existing.latest_version || 1) + 1;
      const { data: version, error: versionError } = await supabase
        .from("artifact_versions")
        .insert({
          artifact_id: existing.id,
          version_number: nextVersion,
          content: normalized.content,
          metadata: normalized.metadata,
        })
        .select("*")
        .single();

      if (versionError) {
        return NextResponse.json({ error: versionError.message }, { status: 500 });
      }

      await supabase
        .from("artifacts")
        .update({
          title: payload.title,
          latest_version: nextVersion,
          metadata: {
            ...(existing.metadata || {}),
            ...(normalized.metadata || {}),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      return NextResponse.json({ artifact: existing, version });
    }

    const { data: artifact, error } = await supabase
      .from("artifacts")
      .insert({
        user_id: user.id,
        tool_id: payload.toolId,
        artifact_type: payload.artifactType,
        title: payload.title,
        latest_version: 1,
        metadata: normalized.metadata,
      })
      .select("*")
      .single();

    if (error || !artifact) {
      return NextResponse.json({ error: error?.message || "Failed to create artifact" }, { status: 500 });
    }

    const { error: versionError } = await supabase.from("artifact_versions").insert({
      artifact_id: artifact.id,
      version_number: 1,
      content: normalized.content,
      metadata: normalized.metadata,
    });

    if (versionError) {
      return NextResponse.json({ error: versionError.message }, { status: 500 });
    }

    return NextResponse.json(artifact);
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.issues) {
      return NextResponse.json({ error: "Invalid payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || "Failed to create artifact" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthedToolboxContext();
    const { data, error } = await supabase
      .from("artifacts")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || "Failed to fetch artifacts" }, { status: 500 });
  }
}
