import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { createHash } from "crypto";

const EXTRACTION_CACHE_TTL_MS = 30 * 60 * 1000;
const extractionCache = new Map<string, { text: string; layoutText: string; expiresAt: number }>();

function getCacheKey(type: string, buffer: Buffer) {
  return createHash('sha256').update(type).update(buffer).digest('hex');
}

function getFromExtractionCache(key: string) {
  const hit = extractionCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    extractionCache.delete(key);
    return null;
  }
  return hit;
}

function setExtractionCache(key: string, value: { text: string; layoutText: string }) {
  extractionCache.set(key, {
    ...value,
    expiresAt: Date.now() + EXTRACTION_CACHE_TTL_MS,
  });
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(input: string): string {
  return decodeHtmlEntities(
    input
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function extractHtmlLinks(input: string): string[] {
  const matches = input.match(/href=["']([^"']+)["']/gi) || [];
  const links = matches
    .map((match) => {
      const capture = match.match(/href=["']([^"']+)["']/i);
      return capture?.[1] || "";
    })
    .map((link) => link.trim())
    .filter(Boolean);
  return Array.from(new Set(links));
}

function countHtmlImages(input: string): number {
  return (input.match(/<img\b/gi) || []).length;
}

function appendMediaMetadata(base: string, input: { imageCount?: number; links?: string[] }): string {
  const out = [base.trim()].filter(Boolean);
  if ((input.imageCount || 0) > 0) out.push(`[image] ${input.imageCount} embedded image(s)`);
  const links = input.links || [];
  if (links.length > 0) {
    out.push(`[link-count] ${links.length}`);
    for (const link of links.slice(0, 10)) out.push(`[link] ${link}`);
  }
  return out.join("\n").trim();
}

function annotateLayoutFromPlainText(text: string): string {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim());
  const out: string[] = [];

  for (const rawLine of lines) {
    if (!rawLine) {
      out.push("");
      continue;
    }

    const isUpperShort = rawLine === rawLine.toUpperCase() && rawLine.length <= 90;
    const isBullet = /^[-*•]\s+/.test(rawLine) || /^\d+[\.\)]\s+/.test(rawLine);
    const isSection = /^[A-Z][^.!?]{0,90}:$/.test(rawLine);

    if (isUpperShort) {
      out.push(`{font=21}{weight=700}${rawLine}`);
    } else if (isSection) {
      out.push(`{font=18}{weight=600}${rawLine}`);
    } else if (isBullet) {
      out.push(`{font=12}{list=1}${rawLine}`);
    } else {
      out.push(`{font=13}${rawLine}`);
    }
  }

  return out.join("\n").trim();
}

function annotateLayoutFromDocxHtml(html: string): string {
  const blocks = html
    .replace(/\r\n/g, "\n")
    .replace(/<\/p>/gi, "</p>\n")
    .replace(/<\/h1>/gi, "</h1>\n")
    .replace(/<\/h2>/gi, "</h2>\n")
    .replace(/<\/h3>/gi, "</h3>\n")
    .replace(/<\/li>/gi, "</li>\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const out: string[] = [];

  for (const block of blocks) {
    const text = stripHtml(block);
    if (!text) continue;

    if (/^<h1[\s>]/i.test(block)) {
      out.push(`{font=24}{weight=700}${text}`);
      continue;
    }
    if (/^<h2[\s>]/i.test(block)) {
      out.push(`{font=20}{weight=650}${text}`);
      continue;
    }
    if (/^<h3[\s>]/i.test(block)) {
      out.push(`{font=17}{weight=600}${text}`);
      continue;
    }
    if (/^<li[\s>]/i.test(block)) {
      out.push(`{font=12}{list=1}• ${text}`);
      continue;
    }

    out.push(`{font=13}${text}`);
  }

  return out.join("\n").trim();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const type = file.type;

    if (type === "text/plain") {
      const text = await file.text();
      const layoutText = annotateLayoutFromPlainText(text);
      return NextResponse.json({ text, layoutText });
    }

    if (type === "application/pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const cacheKey = getCacheKey(type, buffer);
      const cached = getFromExtractionCache(cacheKey);
      if (cached) return NextResponse.json({ text: cached.text, layoutText: cached.layoutText, cached: true });
      const text = extractTextFromPdfBuffer(buffer);
      if (text && text.trim().length > 0) {
        const payload = { text, layoutText: annotateLayoutFromPlainText(text) };
        setExtractionCache(cacheKey, payload);
        return NextResponse.json(payload);
      }
      return NextResponse.json({
        text: "",
        layoutText: "",
        note: "Could not extract text from PDF. Re-upload or paste text directly.",
      });
    }

    if (
      type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const cacheKey = getCacheKey(type, buffer);
      const cached = getFromExtractionCache(cacheKey);
      if (cached) return NextResponse.json({ text: cached.text, layoutText: cached.layoutText, cached: true });
      const { text, layoutText } = await extractTextFromDocx(buffer);
      if (text && text.trim().length > 0) {
        const payload = { text, layoutText: layoutText || annotateLayoutFromPlainText(text) };
        setExtractionCache(cacheKey, payload);
        return NextResponse.json(payload);
      }
      return NextResponse.json({
        text: "",
        layoutText: "",
        note: "Could not extract text from DOCX.",
      });
    }

    if (type.startsWith("image/")) {
      return NextResponse.json({
        text: "",
        layoutText: "",
        note: "Image received as raw visual context. OCR extraction is intentionally disabled.",
      });
    }

    return NextResponse.json(
      { error: "Unsupported file type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Extract text error:", error);
    return NextResponse.json(
      { error: "Failed to extract text" },
      { status: 500 }
    );
  }
}

function extractTextFromPdfBuffer(buffer: Buffer): string {
  const content = buffer.toString("latin1");
  const textParts: string[] = [];

  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;

  while ((match = btEtRegex.exec(content)) !== null) {
    const block = match[1];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textParts.push(decodePdfString(tjMatch[1]));
    }

    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    let tjArrayMatch: RegExpExecArray | null;
    while ((tjArrayMatch = tjArrayRegex.exec(block)) !== null) {
      const arrayContent = tjArrayMatch[1];
      const strRegex = /\(([^)]*)\)/g;
      let strMatch: RegExpExecArray | null;
      while ((strMatch = strRegex.exec(arrayContent)) !== null) {
        textParts.push(decodePdfString(strMatch[1]));
      }
    }
  }

  return textParts.join(" ").replace(/\s+/g, " ").trim();
}

function decodePdfString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

async function extractTextFromDocx(buffer: Buffer): Promise<{ text: string; layoutText: string }> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const raw = (result.value || "").replace(/\r\n/g, "\n").trim();

    const htmlResult = await mammoth.convertToHtml({ buffer });
    const html = (htmlResult.value || "").trim();
    const htmlLayout = html ? annotateLayoutFromDocxHtml(html) : "";
    const imageCount = html ? countHtmlImages(html) : 0;
    const links = html ? extractHtmlLinks(html) : [];

    if (raw) {
      return {
        text: raw,
        layoutText: appendMediaMetadata(
          htmlLayout || annotateLayoutFromPlainText(raw),
          { imageCount, links }
        ),
      };
    }

    if (!html) return { text: "", layoutText: "" };
    const text = stripHtml(html);
    return {
      text,
      layoutText: appendMediaMetadata(
        htmlLayout || annotateLayoutFromPlainText(text),
        { imageCount, links }
      ),
    };
  } catch {
    return { text: "", layoutText: "" };
  }
}
