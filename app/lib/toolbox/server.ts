import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { ComputeClass, EntitlementSummary, ToolFeature } from "@/lib/toolbox/contracts";
import { canUseCompute, getPlanDefinition, normalizePlanKey } from "@/lib/toolbox/entitlements";

export async function getAuthedToolboxContext() {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_type, subscription_tier, quiz_usage_today, quiz_usage_date")
    .eq("id", user.id)
    .maybeSingle();

  const subscriptionType = ((profile?.subscription_type as string | null) || "unknown") as
    | "student"
    | "teacher"
    | "unknown";
  const plan = normalizePlanKey(profile?.subscription_tier as string | null | undefined);

  return { supabase, user, profile, plan, subscriptionType };
}

export async function getUsageSummaryForCurrentUser(supabase: any, userId: string) {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthIso = monthStart.toISOString();

  const [{ count: dailyRuns }, { count: monthlyHeavyRuns }, { count: artifactTransforms }] = await Promise.all([
    supabase
      .from("meter_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "tool_run")
      .gte("created_at", `${today}T00:00:00.000Z`),
    supabase
      .from("meter_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "tool_run")
      .eq("compute_class", "heavy")
      .gte("created_at", monthIso),
    supabase
      .from("meter_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "artifact_transform")
      .gte("created_at", monthIso),
  ]);

  return {
    dailyRuns: dailyRuns || 0,
    monthlyHeavyRuns: monthlyHeavyRuns || 0,
    artifactTransforms: artifactTransforms || 0,
  };
}

export async function getEntitlementSummary(supabase: any, userId: string, plan: any, subscriptionType: any): Promise<EntitlementSummary> {
  const definition = getPlanDefinition(plan);
  const usage = await getUsageSummaryForCurrentUser(supabase, userId);
  return {
    plan,
    subscriptionType,
    limits: definition.limits,
    usage,
    features: definition.features,
  };
}

export function assertFeature(entitlements: EntitlementSummary, feature: ToolFeature) {
  if (!entitlements.features[feature]) {
    const error = new Error(`Feature '${feature}' is not available on your current plan.`);
    (error as any).code = "FEATURE_NOT_ENTITLED";
    throw error;
  }
}

export function assertRunAllowed(
  entitlements: EntitlementSummary,
  computeClass: ComputeClass
) {
  if (entitlements.usage.dailyRuns >= entitlements.limits.dailyRuns) {
    const error = new Error("Daily run limit reached.");
    (error as any).code = "RUN_LIMIT_REACHED";
    throw error;
  }

  if (!canUseCompute(entitlements.plan, computeClass)) {
    const error = new Error(`Compute class '${computeClass}' is not available on your plan.`);
    (error as any).code = "COMPUTE_NOT_ENTITLED";
    throw error;
  }

  if (
    computeClass === "heavy" &&
    entitlements.usage.monthlyHeavyRuns >= entitlements.limits.monthlyHeavyRuns
  ) {
    const error = new Error("Monthly heavy-compute limit reached.");
    (error as any).code = "HEAVY_RUN_LIMIT_REACHED";
    throw error;
  }
}

export async function recordMeterEvent(
  supabase: any,
  input: {
    userId: string;
    eventType: "tool_run" | "artifact_transform" | "collab";
    featureKey: string;
    computeClass: ComputeClass;
    quantity?: number;
    metadata?: Record<string, any>;
  }
) {
  await supabase.from("meter_events").insert({
    user_id: input.userId,
    event_type: input.eventType,
    feature_key: input.featureKey,
    compute_class: input.computeClass,
    quantity: input.quantity || 1,
    metadata: input.metadata || {},
  });
}
