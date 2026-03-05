import { NextResponse } from "next/server";
import {
  assertFeature,
  getAuthedToolboxContext,
  getEntitlementSummary,
} from "@/lib/toolbox/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { supabase, user, plan, subscriptionType } = await getAuthedToolboxContext();
    const entitlements = await getEntitlementSummary(supabase, user.id, plan, subscriptionType);
    assertFeature(entitlements, "artifact_history");

    const { data: artifact } = await supabase
      .from("artifacts")
      .select("*")
      .eq("id", resolvedParams.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    const { data: versions, error } = await supabase
      .from("artifact_versions")
      .select("*")
      .eq("artifact_id", resolvedParams.id)
      .order("version_number", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      artifact,
      versions: versions || [],
    });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Failed to load artifact history", code: error?.code || "INTERNAL_ERROR" },
      { status: error?.code === "FEATURE_NOT_ENTITLED" ? 403 : 500 }
    );
  }
}
