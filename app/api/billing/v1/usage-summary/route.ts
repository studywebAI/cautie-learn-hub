import { NextResponse } from "next/server";
import { getAuthedToolboxContext, getEntitlementSummary } from "@/lib/toolbox/server";

export async function GET() {
  try {
    const { supabase, user, plan, subscriptionType } = await getAuthedToolboxContext();
    const entitlements = await getEntitlementSummary(supabase, user.id, plan, subscriptionType);
    return NextResponse.json({
      usage: entitlements.usage,
      limits: entitlements.limits,
      remaining: {
        dailyRuns: Math.max(entitlements.limits.dailyRuns - entitlements.usage.dailyRuns, 0),
        monthlyHeavyRuns: Math.max(
          entitlements.limits.monthlyHeavyRuns - entitlements.usage.monthlyHeavyRuns,
          0
        ),
        artifactTransforms: Math.max(
          entitlements.limits.artifactTransforms - entitlements.usage.artifactTransforms,
          0
        ),
      },
      plan: entitlements.plan,
      subscriptionType: entitlements.subscriptionType,
    });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || "Failed to load usage summary" }, { status: 500 });
  }
}
