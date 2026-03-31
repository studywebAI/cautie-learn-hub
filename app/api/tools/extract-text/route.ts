import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const type = file.type;

    // Plain text files – read directly
    if (type === "text/plain") {
      const text = await file.text();
      return NextResponse.json({ text });
    }

    // PDF – extract text with a lightweight approach
    if (type === "application/pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const text = extractTextFromPdfBuffer(buffer);
      if (text && text.trim().length > 0) {
        return NextResponse.json({ text });
      }
      return NextResponse.json({
        text: "",
        note: "Kon geen tekst uit PDF extraheren. Probeer de tekst te kopiëren en plakken.",
      });
    }

    // DOCX – extract text from XML inside the zip
    if (
      type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const text = await extractTextFromDocx(buffer);
      if (text && text.trim().length > 0) {
        return NextResponse.json({ text });
      }
      return NextResponse.json({
        text: "",
        note: "Kon geen tekst uit DOCX extraheren.",
      });
    }

    // Images – if Gemini API key available, use vision; otherwise return empty
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
                      text: "Extract ALL text visible in this image. Return only the extracted text, nothing else. If there is no text, return an empty string.",
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
          return NextResponse.json({ text: extractedText });
        }
      }

      return NextResponse.json({
        text: "",
        note: "Afbeelding tekst extractie niet beschikbaar.",
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

/**
 * Basic PDF text extraction – pulls text from stream objects.
 * Not perfect for all PDFs but works for most text-based ones.
 */
function extractTextFromPdfBuffer(buffer: Buffer): string {
  const content = buffer.toString("latin1");
  const textParts: string[] = [];

  // Find text between BT and ET markers (text objects)
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;

  while ((match = btEtRegex.exec(content)) !== null) {
    const block = match[1];
    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textParts.push(decodePdfString(tjMatch[1]));
    }

    // TJ arrays
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    let tjArrayMatch;
    while ((tjArrayMatch = tjArrayRegex.exec(block)) !== null) {
      const arrayContent = tjArrayMatch[1];
      const strRegex = /\(([^)]*)\)/g;
      let strMatch;
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

/**
 * Extract text from DOCX by reading the document.xml inside the zip.
 */
async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || "").replace(/\r\n/g, "\n").trim();
  } catch {
    return "";
  }
}
