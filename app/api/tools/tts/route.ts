import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 6000;

type TTSBody = {
  text?: string;
  voice?: string;
  format?: "mp3" | "wav";
  speed?: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as TTSBody;
    const text = String(body?.text || "").trim();
    const voice = String(body?.voice || "alloy").trim();
    const format = body?.format === "wav" ? "wav" : "mp3";
    const speed = Number.isFinite(Number(body?.speed))
      ? Math.max(0.5, Math.min(2, Number(body?.speed)))
      : 1;

    if (!text) {
      return NextResponse.json({ error: "Missing text." }, { status: 400 });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text too long. Max ${MAX_TEXT_LENGTH} characters.` },
        { status: 413 }
      );
    }

    const groqApiKey = String(process.env.GROQ_API_KEY || "").trim();
    if (!groqApiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const model = String(process.env.GROQ_TTS_MODEL || "playai-tts").trim();
    const upstream = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        response_format: format,
        speed,
      }),
    });

    if (!upstream.ok) {
      const payload = await upstream.json().catch(() => ({} as any));
      return NextResponse.json(
        {
          error:
            payload?.error?.message ||
            `Groq TTS failed (${upstream.status})`,
          code: payload?.error?.code || "GROQ_TTS_FAILED",
        },
        { status: upstream.status }
      );
    }

    const bytes = await upstream.arrayBuffer();
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": format === "wav" ? "audio/wav" : "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected TTS error." },
      { status: 500 }
    );
  }
}

