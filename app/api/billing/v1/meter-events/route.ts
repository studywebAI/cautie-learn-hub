import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedToolboxContext, recordMeterEvent } from "@/lib/toolbox/server";
import type { ComputeClass } from "@/lib/toolbox/contracts";

const MeterEventSchema = z.object({
  eventType: z.enum(["tool_run", "artifact_transform", "collab"]),
  featureKey: z.string().min(1),
  computeClass: z.enum(["light", "standard", "heavy"]).default("standard"),
  quantity: z.number().int().positive().max(100).default(1),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedToolboxContext();
    const parsed = MeterEventSchema.parse(await request.json());
    await recordMeterEvent(supabase, {
      userId: user.id,
      eventType: parsed.eventType,
      featureKey: parsed.featureKey,
      computeClass: parsed.computeClass as ComputeClass,
      quantity: parsed.quantity,
      metadata: parsed.metadata,
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.issues) {
      return NextResponse.json({ error: "Invalid payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || "Failed to record meter event" }, { status: 500 });
  }
}
