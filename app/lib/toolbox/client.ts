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
  const controller = new AbortController();
  const timeoutMs = 120_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const idempotencyKey =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  let response: Response;
  const startedAt = Date.now();
  console.info("[toolflow.client] run_start", {
    toolId: payload.toolId,
    flowName: payload.flowName,
    mode: payload.mode || null,
    computeClass: payload.computeClass || "standard",
    idempotencyKey,
  });
  try {
    response = await fetch("/api/tools/v2/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        ...payload,
        idempotencyKey,
        computeClass: payload.computeClass || "standard",
        persistArtifact: payload.persistArtifact ?? true,
      }),
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error(`Tool run timed out after ${Math.round(timeoutMs / 1000)}s`) as Error & { code?: string };
      timeoutError.code = "CLIENT_TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error || "Tool execution failed";
    const code = data?.code ? String(data.code) : "";
    const runId = data?.runId ? String(data.runId) : "";
    const enriched = [message, code ? `(code: ${code})` : "", runId ? `(run: ${runId})` : ""].filter(Boolean).join(" ");
    const error = new Error(enriched) as Error & { code?: string; runId?: string };
    if (code) error.code = code;
    if (runId) error.runId = runId;
      toolId: payload.toolId,
      flowName: payload.flowName,
      status: response.status,
      code: code || null,
      runId: runId || null,
      durationMs: Date.now() - startedAt,
      message,
    });
    throw error;
  }
  console.info("[toolflow.client] run_success", {
    toolId: payload.toolId,
    flowName: payload.flowName,
    runId: data?.id || null,
    status: data?.status || null,
    durationMs: Date.now() - startedAt,
  });
  return data;
}
