export type ToolFeature =
  | "tool_runs"
  | "artifact_transforms"
  | "artifact_history"
  | "collab_comments"
  | "collab_suggestions"
  | "teacher_workflows"
  | "advanced_analytics"
  | "bulk_generation";

export type ComputeClass = "light" | "standard" | "heavy";

export type ToolRunStatus = "queued" | "running" | "succeeded" | "failed";

export type PlanKey = "free" | "premium" | "pro" | "team" | "school";

export type EntitlementSummary = {
  plan: PlanKey;
  subscriptionType: "student" | "teacher" | "unknown";
  limits: {
    dailyRuns: number;
    monthlyHeavyRuns: number;
    artifactTransforms: number;
    collabSeats: number;
  };
  usage: {
    dailyRuns: number;
    monthlyHeavyRuns: number;
    artifactTransforms: number;
  };
  features: Record<ToolFeature, boolean>;
};
