import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  assertFeature,
  getAuthedToolboxContext,
  getEntitlementSummary,
} from "@/lib/toolbox/server";

const CreateSuggestionSchema = z.object({
  artifactId: z.string().uuid(),
  patch: z.record(z.any()),
  note: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, plan, subscriptionType } = await getAuthedToolboxContext();
    const entitlements = await getEntitlementSummary(supabase, user.id, plan, subscriptionType);
    assertFeature(entitlements, "collab_suggestions");

    const payload = CreateSuggestionSchema.parse(await request.json());

    const { data: artifact } = await supabase
      .from("artifacts")
      .select("id,user_id")
      .eq("id", payload.artifactId)
      .maybeSingle();

    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("suggestions")
      .insert({
        artifact_id: payload.artifactId,
        author_id: user.id,
        patch: payload.patch,
        note: payload.note || null,
        status: "pending",
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
      { error: error?.message || "Failed to create suggestion", code: error?.code || "INTERNAL_ERROR" },
      { status: error?.code === "FEATURE_NOT_ENTITLED" ? 403 : 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedToolboxContext();
    const artifactId = request.nextUrl.searchParams.get("artifactId");
    if (!artifactId) {
      return NextResponse.json({ error: "artifactId is required" }, { status: 400 });
    }

    const { data: artifact } = await supabase
      .from("artifacts")
      .select("id,user_id")
      .eq("id", artifactId)
      .maybeSingle();

    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }
    if (artifact.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("suggestions")
      .select("*")
      .eq("artifact_id", artifactId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || "Failed to load suggestions" }, { status: 500 });
  }
}
