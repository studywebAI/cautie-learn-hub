import { executeAIFlow, getSupportedFlows } from "@/lib/ai/flow-executor";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { readUserAIRuntimeOptions } from "@/lib/ai/runtime-settings";

export async function POST(req: Request) {
  try {
    const { flowName, input } = await req.json();

    if (!flowName || typeof flowName !== "string") {
      return Response.json(
        { error: "Missing or invalid flowName" },
        { status: 400 }
      );
    }

    try {
      let runtimeOptions: any = {};
      try {
        const supabase = await createClient(cookies());
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          runtimeOptions = await readUserAIRuntimeOptions(supabase, user.id);
        }
      } catch {
        runtimeOptions = {};
      }

      const result = await executeAIFlow(flowName, input, runtimeOptions);
      return Response.json(result);
    } catch (err: any) {
      const message = err?.message || "Flow execution failed";
      const isMissingKey = message.includes("Missing GEMINI_API_KEY");
      return Response.json(
        {
          error: isMissingKey ? "AI Configuration Missing" : message,
          flowName,
          ...(process.env.NODE_ENV === "development" && { stack: err?.stack }),
        },
        { status: isMissingKey ? 503 : 500 }
      );
    }
  } catch (err: any) {
    return Response.json(
      {
        error: err?.message || "Unknown server error",
        ...(process.env.NODE_ENV === "development" && { stack: err?.stack }),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ flows: getSupportedFlows() });
}
