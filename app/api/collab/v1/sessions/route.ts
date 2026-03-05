import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedToolboxContext } from "@/lib/toolbox/server";

const CreateSessionSchema = z.object({
  artifactId: z.string().uuid(),
  mode: z.enum(["view", "comment", "edit"]).default("comment"),
});

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedToolboxContext();
    const payload = CreateSessionSchema.parse(await request.json());

    const { data: artifact } = await supabase
      .from("artifacts")
      .select("id,user_id")
      .eq("id", payload.artifactId)
      .maybeSingle();

    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("collab_sessions")
      .insert({
        artifact_id: payload.artifactId,
        owner_id: artifact.user_id,
        created_by: user.id,
        mode: payload.mode,
        status: "active",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.issues) {
      return NextResponse.json({ error: "Invalid payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || "Failed to create collab session" }, { status: 500 });
  }
}
