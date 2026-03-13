import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeAIFlow } from "@/lib/ai/flow-executor";
import type { ComputeClass, ToolRunStatus } from "@/lib/toolbox/contracts";
import {
  assertRunAllowed,
  getAuthedToolboxContext,
  getEntitlementSummary,
  recordMeterEvent,
} from "@/lib/toolbox/server";

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

    const { data: createdRun, error: runError } = await supabase
      .from("tool_runs")
      .insert({
        user_id: user.id,
        tool_id: payload.toolId,
        flow_name: payload.flowName,
        mode: payload.mode || null,
        status: "queued",
        input_payload: payload.input || payload.source || {},
        context_payload: payload.context || {},
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

    try {
      const inputPayload = payload.input || payload.source || {};
      const output = await executeAIFlow(payload.flowName, inputPayload);
      let artifactId: string | null = null;

      if (payload.persistArtifact) {
        const { data: artifact } = await supabase
          .from("artifacts")
          .insert({
            user_id: user.id,
            tool_id: payload.toolId,
            artifact_type: payload.artifactType || payload.toolId,
            title: payload.artifactTitle || `${payload.toolId} output`,
            latest_version: 1,
            metadata: {
              mode: payload.mode || null,
              runId: createdRun.id,
            },
          })
          .select("*")
          .single();

        if (artifact) {
          artifactId = artifact.id;
          await supabase.from("artifact_versions").insert({
            artifact_id: artifact.id,
            version_number: 1,
            content: output,
            metadata: {
              createdByRun: createdRun.id,
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
