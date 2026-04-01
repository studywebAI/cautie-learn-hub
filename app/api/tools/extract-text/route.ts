import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

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
      return NextResponse.json({ text, layoutText: annotateLayoutFromPlainText(text) });
    }

    if (type === "application/pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const text = extractTextFromPdfBuffer(buffer);
      if (text && text.trim().length > 0) {
        return NextResponse.json({ text, layoutText: annotateLayoutFromPlainText(text) });
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
      const { text, layoutText } = await extractTextFromDocx(buffer);
      if (text && text.trim().length > 0) {
        return NextResponse.json({ text, layoutText: layoutText || annotateLayoutFromPlainText(text) });
      }
      return NextResponse.json({
        text: "",
        layoutText: "",
        note: "Could not extract text from DOCX.",
      });
    }

    if (type.startsWith("image/")) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const arrayBuf = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString("base64");
        const mimeType = type;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      inlineData: { mimeType, data: base64 },
                    },
                    {
                      text: "Extract all visible text from this image. Return only extracted text.",
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const extractedText =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          return NextResponse.json({
            text: extractedText,
            layoutText: annotateLayoutFromPlainText(extractedText),
          });
        }
      }

      return NextResponse.json({
        text: "",
        layoutText: "",
        note: "Image text extraction unavailable.",
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

    if (raw) {
      return {
        text: raw,
        layoutText: htmlLayout || annotateLayoutFromPlainText(raw),
      };
    }

    if (!html) return { text: "", layoutText: "" };
    const text = stripHtml(html);
    return {
      text,
      layoutText: htmlLayout || annotateLayoutFromPlainText(text),
    };
  } catch {
    return { text: "", layoutText: "" };
  }
}
