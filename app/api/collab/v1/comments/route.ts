import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  assertFeature,
  getAuthedToolboxContext,
  getEntitlementSummary,
} from "@/lib/toolbox/server";

const CreateCommentSchema = z.object({
  artifactId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  selectionPath: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, plan, subscriptionType } = await getAuthedToolboxContext();
    const entitlements = await getEntitlementSummary(supabase, user.id, plan, subscriptionType);
    assertFeature(entitlements, "collab_comments");

    const payload = CreateCommentSchema.parse(await request.json());

    const { data: artifact } = await supabase
      .from("artifacts")
      .select("id,user_id")
      .eq("id", payload.artifactId)
      .maybeSingle();

    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        artifact_id: payload.artifactId,
        author_id: user.id,
        content: payload.content,
        selection_path: payload.selectionPath || null,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.issues) {
      return NextResponse.json({ error: "Invalid payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || "Failed to create comment", code: error?.code || "INTERNAL_ERROR" },
      { status: error?.code === "FEATURE_NOT_ENTITLED" ? 403 : 500 }
    );
  }
}
