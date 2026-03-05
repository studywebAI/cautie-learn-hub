import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeAIFlow } from "@/lib/ai/flow-executor";
import {
  assertFeature,
  getAuthedToolboxContext,
  getEntitlementSummary,
  recordMeterEvent,
} from "@/lib/toolbox/server";

const TransformSchema = z.object({
  targetToolId: z.string().min(1),
  targetFlowName: z.string().min(1),
  transformInput: z.record(z.any()).optional(),
  title: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { supabase, user, plan, subscriptionType } = await getAuthedToolboxContext();
    const entitlements = await getEntitlementSummary(supabase, user.id, plan, subscriptionType);
    assertFeature(entitlements, "artifact_transforms");

    const payload = TransformSchema.parse(await request.json());

    const { data: artifact } = await supabase
      .from("artifacts")
      .select("*")
      .eq("id", resolvedParams.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    const { data: latestVersion } = await supabase
      .from("artifact_versions")
      .select("*")
      .eq("artifact_id", artifact.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const transformed = await executeAIFlow(payload.targetFlowName, {
      sourceArtifact: latestVersion?.content || {},
      sourceArtifactId: artifact.id,
      ...payload.transformInput,
    });

    const { data: newArtifact, error: newArtifactError } = await supabase
      .from("artifacts")
      .insert({
        user_id: user.id,
        tool_id: payload.targetToolId,
        artifact_type: payload.targetToolId,
        title: payload.title || `${artifact.title} -> ${payload.targetToolId}`,
        latest_version: 1,
        metadata: {
          transformedFrom: artifact.id,
        },
      })
      .select("*")
      .single();

    if (newArtifactError || !newArtifact) {
      return NextResponse.json({ error: newArtifactError?.message || "Failed to create transformed artifact" }, { status: 500 });
    }

    await supabase.from("artifact_versions").insert({
      artifact_id: newArtifact.id,
      version_number: 1,
      content: transformed,
      metadata: {
        transformedFrom: artifact.id,
      },
    });

    await supabase.from("artifact_links").insert({
      source_artifact_id: artifact.id,
      target_artifact_id: newArtifact.id,
      link_type: "transformed_to",
      metadata: {
        targetFlowName: payload.targetFlowName,
      },
    });

    await recordMeterEvent(supabase, {
      userId: user.id,
      eventType: "artifact_transform",
      featureKey: payload.targetToolId,
      computeClass: "standard",
      metadata: {
        sourceArtifactId: artifact.id,
        targetArtifactId: newArtifact.id,
      },
    });

    return NextResponse.json(newArtifact);
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.issues) {
      return NextResponse.json({ error: "Invalid payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || "Failed to transform artifact", code: error?.code || "INTERNAL_ERROR" },
      { status: error?.code === "FEATURE_NOT_ENTITLED" ? 403 : 500 }
    );
  }
}
