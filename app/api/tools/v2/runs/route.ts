import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { executeAIFlow } from "@/lib/ai/flow-executor";
import { readUserAIRuntimeOptions } from "@/lib/ai/runtime-settings";
import type { ComputeClass, ToolRunStatus } from "@/lib/toolbox/contracts";
import { enforceSourceOnlyGuard } from "@/lib/toolbox/source-guard";
import {
  assertRunAllowed,
  getAuthedToolboxContext,
  getEntitlementSummary,
  recordMeterEvent,
} from "@/lib/toolbox/server";
import { resolveSelectedSourcesForRun } from "@/lib/integrations/run-source-resolver";
import type { CanonicalDocument } from "@/lib/tools/canonical-model";

const CreateRunSchema = z.object({
  toolId: z.string().min(1),
  flowName: z.string().min(1),
  mode: z.string().optional(),
  source: z.record(z.any()).optional(),
  context: z.record(z.any()).optional(),
  options: z.record(z.any()).optional(),
  input: z.record(z.any()).optional(),
  computeClass: z.enum(["light", "standard", "heavy"]).default("standard"),
  idempotencyKey: z.string().min(8).max(128),
  persistArtifact: z.boolean().default(true),
  artifactTitle: z.string().optional(),
  artifactType: z.string().optional(),
});

async function writeRunEvent(supabase: any, runId: string, eventType: string, payload: Record<string, any>) {
  await supabase.from("tool_run_events").insert({
    run_id: runId,
    event_type: eventType,
    payload,
  });
}

function sanitizeErrorText(value: unknown, max = 2000) {
  const raw = String(value || "");
  if (!raw) return "";
  // Redact obvious key-like values before persisting.
  const redacted = raw
    .replace(/sk-[a-z0-9-_]{16,}/gi, "[REDACTED_KEY]")
    .replace(/api[_-]?key\s*[:=]\s*['"]?[a-z0-9._-]{8,}['"]?/gi, "api_key=[REDACTED]");
  return redacted.slice(0, max);
}

async function writeAIErrorLog(
  supabase: any,
  input: {
    runId?: string | null;
    userId: string;
    toolId: string;
    flowName: string;
    providerPreference: "auto" | "gemini" | "openai";
    providerAttempted: "gemini" | "openai";
    stage: "primary_error" | "fallback_error" | "run_failed";
    fallbackAttempted: boolean;
    fallbackSucceeded: boolean;
    code?: string;
    message?: string;
  }
) {
  const payload = {
    run_id: input.runId || null,
    user_id: input.userId,
    tool_id: input.toolId,
    flow_name: input.flowName,
    provider_preference: input.providerPreference,
    provider_attempted: input.providerAttempted,
    stage: input.stage,
    fallback_attempted: input.fallbackAttempted,
    fallback_succeeded: input.fallbackSucceeded,
    error_code: input.code ? String(input.code).slice(0, 120) : null,
    error_message: sanitizeErrorText(input.message, 8000) || "Unknown AI error",
    fingerprint: createHash("sha256")
      .update(
        [
          input.flowName,
          input.providerAttempted,
          input.stage,
          input.code || "",
          sanitizeErrorText(input.message, 512),
        ].join("|")
      )
      .digest("hex"),
  };

  const { error } = await supabase.from("ai_error_logs").insert(payload);
  if (error) {
    const errorCode = String(error.code || "");
    const errorMessage = String(error.message || "").toLowerCase();
    // Migration-safe: keep runtime resilient when logging table is not present yet.
    if (
      errorCode === "PGRST205" ||
      errorMessage.includes("could not find the table") ||
      errorMessage.includes("ai_error_logs")
    ) {
      return;
    }
    // Non-blocking; keep tool execution result path stable.
    console.error("[ai_error_logs] insert failed", {
      message: error.message,
      code: error.code,
    });
  }
}

async function writeRunSources(supabase: any, runId: string, userId: string, sources: any[]) {
  if (!Array.isArray(sources) || sources.length === 0) return;
  const rows = sources.map((source) => {
    const provider = String(source?.provider || "");
    const app = String(source?.app || "");
    const name = String(source?.name || "source");
    const text = String(source?.extracted_text || "");
    const webUrl = source?.web_url ? String(source.web_url) : null;
    const fingerprint = createHash("sha256")
      .update(`${provider}|${app}|${name}|${text}`)
      .digest("hex");
    return {
      run_id: runId,
      user_id: userId,
      provider,
      app,
      source_item_id: String(source?.provider_item_id || source?.id || ""),
      source_name: name,
      source_uri: webUrl,
      source_kind: app,
      extraction_status: String(source?.extraction_status || "unknown"),
      content_fingerprint: fingerprint,
      source_preview: text ? text.slice(0, 2000) : null,
      metadata: source?.metadata || {},
    };
  });

  const { error } = await supabase.from("tool_run_sources").insert(rows);
  if (error) {
    await writeRunEvent(supabase, runId, "run_sources_write_failed", {
      error: error.message || "Failed to store run sources",
      count: rows.length,
    });
  }
}

function extractCanonicalFromOutput(output: any): CanonicalDocument | null {
  const candidate = output?.canonical_v1;
  if (!candidate || typeof candidate !== "object") return null;
  return candidate as CanonicalDocument;
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, plan, subscriptionType } = await getAuthedToolboxContext();
    const payload = CreateRunSchema.parse(await request.json());
    const entitlements = await getEntitlementSummary(supabase, user.id, plan, subscriptionType);
    assertRunAllowed(entitlements, payload.computeClass as ComputeClass);

    const { data: existingRun } = await supabase
      .from("tool_runs")
      .select("*")
      .eq("user_id", user.id)
      .eq("idempotency_key", payload.idempotencyKey)
      .maybeSingle();

    if (existingRun) {
      return NextResponse.json(existingRun);
    }

    const baseInput = (payload.input || payload.source || {}) as Record<string, any>;
    const enriched = await resolveSelectedSourcesForRun(supabase, {
      userId: user.id,
      toolId: payload.toolId,
      baseInput,
    });
    const contextPayload = {
      ...(payload.context || {}),
      integration_sources: enriched.sourceRefs,
    };

    const { data: createdRun, error: runError } = await supabase
      .from("tool_runs")
      .insert({
        user_id: user.id,
        tool_id: payload.toolId,
        flow_name: payload.flowName,
        mode: payload.mode || null,
        status: "queued",
        input_payload: enriched.input,
        context_payload: contextPayload,
        options_payload: payload.options || {},
        compute_class: payload.computeClass,
        idempotency_key: payload.idempotencyKey,
      })
      .select("*")
      .single();

    if (runError || !createdRun) {
      return NextResponse.json({ error: runError?.message || "Failed to create run" }, { status: 500 });
    }

    await writeRunEvent(supabase, createdRun.id, "queued", {
      toolId: payload.toolId,
      flowName: payload.flowName,
    });

    await supabase.from("tool_runs").update({ status: "running" }).eq("id", createdRun.id);
    await writeRunEvent(supabase, createdRun.id, "started", {});
    await writeRunSources(supabase, createdRun.id, user.id, enriched.selectedSourcesRaw || []);

    try {
      const inputPayload = enriched.input;
      const runtimeOptions = await readUserAIRuntimeOptions(supabase, user.id);
      const aiEvents: Array<{
        type: "primary_error" | "fallback_attempt" | "fallback_success" | "fallback_error";
        provider: "gemini" | "openai";
        flowName: string;
        message?: string;
        code?: string;
      }> = [];
      const output = await executeAIFlow(payload.flowName, inputPayload, {
        ...runtimeOptions,
        onEvent: (event) => aiEvents.push(event),
      });

      for (const event of aiEvents) {
        await writeRunEvent(supabase, createdRun.id, `ai_${event.type}`, {
          provider: event.provider,
          flowName: event.flowName,
          code: event.code || null,
          message: sanitizeErrorText(event.message, 1000) || null,
        });

        if (event.type === "primary_error" || event.type === "fallback_error") {
          await writeAIErrorLog(supabase, {
            runId: createdRun.id,
            userId: user.id,
            toolId: payload.toolId,
            flowName: payload.flowName,
            providerPreference: runtimeOptions.providerPreference || "auto",
            providerAttempted: event.provider,
            stage: event.type,
            fallbackAttempted: aiEvents.some((item) => item.type === "fallback_attempt"),
            fallbackSucceeded: aiEvents.some((item) => item.type === "fallback_success"),
            code: event.code,
            message: event.message,
          });
        }
      }

      enforceSourceOnlyGuard({
        toolId: payload.toolId,
        inputPayload,
        outputPayload: output,
      });
      let artifactId: string | null = null;

      if (payload.persistArtifact) {
        const canonical = extractCanonicalFromOutput(output);
        const artifactMetadata = {
          mode: payload.mode || null,
          runId: createdRun.id,
          ...(canonical
            ? {
                canonical_v1: canonical,
                payload_format: "canonical_v1",
              }
            : {}),
        };
        const artifactContent = canonical
          ? {
              ...(output && typeof output === "object" ? output : { value: output }),
              format: "canonical_v1",
              canonical_v1: canonical,
            }
          : output;

        const { data: artifact } = await supabase
          .from("artifacts")
          .insert({
            user_id: user.id,
            tool_id: payload.toolId,
            artifact_type: payload.artifactType || payload.toolId,
            title: payload.artifactTitle || `${payload.toolId} output`,
            latest_version: 1,
            metadata: artifactMetadata,
          })
          .select("*")
          .single();

        if (artifact) {
          artifactId = artifact.id;
          await supabase.from("artifact_versions").insert({
            artifact_id: artifact.id,
            version_number: 1,
            content: artifactContent,
            metadata: {
              createdByRun: createdRun.id,
              ...(canonical ? { canonical_v1: canonical, payload_format: "canonical_v1" } : {}),
            },
          });
        }
      }

      await supabase
        .from("tool_runs")
        .update({
          status: "succeeded" as ToolRunStatus,
          output_payload: output,
          output_artifact_id: artifactId,
          finished_at: new Date().toISOString(),
        })
        .eq("id", createdRun.id);

      await writeRunEvent(supabase, createdRun.id, "completed", { artifactId });
      await recordMeterEvent(supabase, {
        userId: user.id,
        eventType: "tool_run",
        featureKey: payload.toolId,
        computeClass: payload.computeClass as ComputeClass,
        metadata: {
          runId: createdRun.id,
          flowName: payload.flowName,
        },
      });

      const { data: finalRun } = await supabase.from("tool_runs").select("*").eq("id", createdRun.id).single();
      return NextResponse.json(finalRun || createdRun);
    } catch (err: any) {
      const errorCode = err?.code || "RUN_FAILED";
      const runtimeOptions = await readUserAIRuntimeOptions(supabase, user.id).catch(() => ({ providerPreference: "auto" as const }));
      const normalizedMessage = String(err?.message || "").toLowerCase();
      const inferredProvider: "gemini" | "openai" =
        normalizedMessage.includes("openai") ? "openai" : "gemini";
      await supabase
        .from("tool_runs")
        .update({
          status: "failed" as ToolRunStatus,
          error_message: err?.message || "Run failed",
          finished_at: new Date().toISOString(),
        })
        .eq("id", createdRun.id);
      await writeRunEvent(supabase, createdRun.id, "failed", {
        error: err?.message || "Run failed",
        code: errorCode,
      });
      await writeAIErrorLog(supabase, {
        runId: createdRun.id,
        userId: user.id,
        toolId: payload.toolId,
        flowName: payload.flowName,
        providerPreference: runtimeOptions.providerPreference || "auto",
        providerAttempted: inferredProvider,
        stage: "run_failed",
        fallbackAttempted: String(err?.message || "").toLowerCase().includes("fallback"),
        fallbackSucceeded: false,
        code: errorCode,
        message: err?.message || "Run failed",
      });
      return NextResponse.json(
        { error: err?.message || "Tool execution failed", code: errorCode, runId: createdRun.id },
        { status: errorCode === "SOURCE_GUARD_FAILED" ? 422 : 500 }
      );
    }
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.issues) {
      return NextResponse.json({ error: "Invalid payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      {
        error: error?.message || "Failed to create tool run",
        code: error?.code || "INTERNAL_ERROR",
      },
      { status: error?.code?.includes("LIMIT") || error?.code?.includes("ENTITLED") ? 403 : 500 }
    );
  }
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthedToolboxContext();
    const { data, error } = await supabase
      .from("tool_runs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || "Failed to fetch tool runs" }, { status: 500 });
  }
}
