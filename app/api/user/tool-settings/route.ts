import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  AdvancedToolSettingsSchema,
  DEFAULT_ADVANCED_TOOL_SETTINGS,
  detectAdvancedSettingsConflicts,
  mergeAdvancedToolSettings,
  type AdvancedToolSettings,
} from "@/lib/tools/advanced-settings-schema";

const PREFERENCE_KEY = "advanced_tool_settings_v1";

async function getUser(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

async function readStoredSettings(supabase: any, userId: string): Promise<AdvancedToolSettings> {
  const { data } = await supabase
    .from("user_preferences")
    .select("preference_value")
    .eq("user_id", userId)
    .eq("preference_key", PREFERENCE_KEY)
    .maybeSingle();

  const raw = data?.preference_value;
  const parsed = AdvancedToolSettingsSchema.safeParse(raw || {});
  return parsed.success ? parsed.data : DEFAULT_ADVANCED_TOOL_SETTINGS;
}

export async function GET() {
  const supabase = await createClient(cookies());
  const user = await getUser(supabase);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const settings = await readStoredSettings(supabase, user.id);
  const conflicts = detectAdvancedSettingsConflicts(settings);
  return NextResponse.json({ settings, conflicts });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient(cookies());
  const user = await getUser(supabase);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload", code: "INVALID_JSON" }, { status: 400 });
  }

  const patch = (body?.patch || body?.settings || {}) as Partial<AdvancedToolSettings>;
  const current = await readStoredSettings(supabase, user.id);
  const merged = mergeAdvancedToolSettings(current, patch);
  const conflicts = detectAdvancedSettingsConflicts(merged, {
    isLiveGeneratedQuiz: Boolean(body?.context?.isLiveGeneratedQuiz),
    tool: body?.context?.tool,
  });

  const hasHardError = conflicts.some((conflict) => conflict.severity === "error");
  if (hasHardError) {
    return NextResponse.json(
      { error: "Setting conflict detected", code: "SETTING_CONFLICT", conflicts },
      { status: 422 }
    );
  }

  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      preference_key: PREFERENCE_KEY,
      preference_value: merged,
    },
    { onConflict: "user_id,preference_key" }
  );

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not save settings", code: "SAVE_FAILED" },
      { status: 500 }
    );
  }

  return NextResponse.json({ settings: merged, conflicts });
}
