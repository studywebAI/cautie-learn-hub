import type {
  ComputeClass,
  EntitlementSummary,
  PlanKey,
  ToolFeature,
} from "@/lib/toolbox/contracts";

type PlanDefinition = {
  limits: EntitlementSummary["limits"];
  features: Record<ToolFeature, boolean>;
  allowedCompute: ComputeClass[];
};

const PLAN_DEFINITIONS: Record<PlanKey, PlanDefinition> = {
  free: {
    limits: {
      dailyRuns: 5,
      monthlyHeavyRuns: 20,
      artifactTransforms: 20,
      collabSeats: 0,
    },
    features: {
      tool_runs: true,
      artifact_transforms: false,
      artifact_history: true,
      collab_comments: false,
      collab_suggestions: false,
      teacher_workflows: false,
      advanced_analytics: false,
      bulk_generation: false,
    },
    allowedCompute: ["light", "standard"],
  },
  premium: {
    limits: {
      dailyRuns: 30,
      monthlyHeavyRuns: 120,
      artifactTransforms: 200,
      collabSeats: 1,
    },
    features: {
      tool_runs: true,
      artifact_transforms: true,
      artifact_history: true,
      collab_comments: true,
      collab_suggestions: false,
      teacher_workflows: false,
      advanced_analytics: true,
      bulk_generation: false,
    },
    allowedCompute: ["light", "standard", "heavy"],
  },
  pro: {
    limits: {
      dailyRuns: 999999,
      monthlyHeavyRuns: 999999,
      artifactTransforms: 999999,
      collabSeats: 3,
    },
    features: {
      tool_runs: true,
      artifact_transforms: true,
      artifact_history: true,
      collab_comments: true,
      collab_suggestions: true,
      teacher_workflows: true,
      advanced_analytics: true,
      bulk_generation: true,
    },
    allowedCompute: ["light", "standard", "heavy"],
  },
  team: {
    limits: {
      dailyRuns: 999999,
      monthlyHeavyRuns: 999999,
      artifactTransforms: 999999,
      collabSeats: 25,
    },
    features: {
      tool_runs: true,
      artifact_transforms: true,
      artifact_history: true,
      collab_comments: true,
      collab_suggestions: true,
      teacher_workflows: true,
      advanced_analytics: true,
      bulk_generation: true,
    },
    allowedCompute: ["light", "standard", "heavy"],
  },
  school: {
    limits: {
      dailyRuns: 999999,
      monthlyHeavyRuns: 999999,
      artifactTransforms: 999999,
      collabSeats: 200,
    },
    features: {
      tool_runs: true,
      artifact_transforms: true,
      artifact_history: true,
      collab_comments: true,
      collab_suggestions: true,
      teacher_workflows: true,
      advanced_analytics: true,
      bulk_generation: true,
    },
    allowedCompute: ["light", "standard", "heavy"],
  },
};

export function normalizePlanKey(
  subscriptionTier: string | null | undefined
): PlanKey {
  const raw = (subscriptionTier || "free").toLowerCase();
  if (raw === "premium") return "premium";
  if (raw === "pro") return "pro";
  if (raw === "team") return "team";
  if (raw === "school") return "school";
  return "free";
}

export function getPlanDefinition(plan: PlanKey): PlanDefinition {
  return PLAN_DEFINITIONS[plan];
}

export function canUseCompute(plan: PlanKey, computeClass: ComputeClass) {
  return PLAN_DEFINITIONS[plan].allowedCompute.includes(computeClass);
}
