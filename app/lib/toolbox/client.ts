import type { ComputeClass } from "@/lib/toolbox/contracts";

type RunToolFlowInput = {
  toolId: string;
  flowName: string;
  input: Record<string, any>;
  mode?: string;
  context?: Record<string, any>;
  options?: Record<string, any>;
  computeClass?: ComputeClass;
  artifactTitle?: string;
  artifactType?: string;
  persistArtifact?: boolean;
};

export async function runToolFlowV2(payload: RunToolFlowInput) {
  const idempotencyKey =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  const response = await fetch("/api/tools/v2/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      idempotencyKey,
      computeClass: payload.computeClass || "standard",
      persistArtifact: payload.persistArtifact ?? true,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Tool execution failed");
  }
  return data;
}
