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
    const message = data?.error || "Tool execution failed";
    const code = data?.code ? String(data.code) : "";
    const enriched = code ? `${message} (code: ${code})` : message;
    const error = new Error(enriched) as Error & { code?: string };
    if (code) error.code = code;
    throw error;
  }
  return data;
}
