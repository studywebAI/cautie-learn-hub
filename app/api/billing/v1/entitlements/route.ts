import { NextResponse } from "next/server";
import { getAuthedToolboxContext, getEntitlementSummary } from "@/lib/toolbox/server";

export async function GET() {
  try {
    const { supabase, user, plan, subscriptionType } = await getAuthedToolboxContext();
    const entitlements = await getEntitlementSummary(supabase, user.id, plan, subscriptionType);
    return NextResponse.json(entitlements);
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || "Failed to load entitlements" }, { status: 500 });
  }
}
