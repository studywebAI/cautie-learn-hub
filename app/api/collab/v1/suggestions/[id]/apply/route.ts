import { NextRequest, NextResponse } from "next/server";
import {
  assertFeature,
  getAuthedToolboxContext,
  getEntitlementSummary,
} from "@/lib/toolbox/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { supabase, user, plan, subscriptionType } = await getAuthedToolboxContext();
    const entitlements = await getEntitlementSummary(supabase, user.id, plan, subscriptionType);
    assertFeature(entitlements, "collab_suggestions");

    const { data: suggestion, error } = await supabase
      .from("suggestions")
      .select("*")
      .eq("id", resolvedParams.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!suggestion) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("suggestions")
      .update({
        status: "applied",
        applied_by: user.id,
        applied_at: new Date().toISOString(),
      })
      .eq("id", resolvedParams.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: resolvedParams.id });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Failed to apply suggestion", code: error?.code || "INTERNAL_ERROR" },
      { status: error?.code === "FEATURE_NOT_ENTITLED" ? 403 : 500 }
    );
  }
}
