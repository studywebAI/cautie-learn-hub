import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedToolboxContext } from "@/lib/toolbox/server";

const CreateArtifactSchema = z.object({
  toolId: z.string().min(1),
  artifactType: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.any(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedToolboxContext();
    const payload = CreateArtifactSchema.parse(await request.json());

    const { data: artifact, error } = await supabase
      .from("artifacts")
      .insert({
        user_id: user.id,
        tool_id: payload.toolId,
        artifact_type: payload.artifactType,
        title: payload.title,
        latest_version: 1,
        metadata: payload.metadata || {},
      })
      .select("*")
      .single();

    if (error || !artifact) {
      return NextResponse.json({ error: error?.message || "Failed to create artifact" }, { status: 500 });
    }

    const { error: versionError } = await supabase.from("artifact_versions").insert({
      artifact_id: artifact.id,
      version_number: 1,
      content: payload.content,
      metadata: payload.metadata || {},
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
