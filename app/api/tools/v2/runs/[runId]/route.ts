import { NextResponse } from "next/server";
import { getAuthedToolboxContext } from "@/lib/toolbox/server";

type Params = { params: Promise<{ runId: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { supabase, user } = await getAuthedToolboxContext();
    const { data: run, error } = await supabase
      .from("tool_runs")
      .select("*")
      .eq("id", resolvedParams.runId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const { data: events } = await supabase
      .from("tool_run_events")
      .select("*")
      .eq("run_id", resolvedParams.runId)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      ...run,
      events: events || [],
    });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || "Failed to load run" }, { status: 500 });
  }
}
