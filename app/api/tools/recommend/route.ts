import { NextRequest, NextResponse } from 'next/server';
import {
  resolveOpenRouterApiKey,
  OPENROUTER_LOCKED_MODEL,
} from '@/lib/ai/openrouter-policy';

const TOOLS = [
  {
    id: 'flashcards',
    label: 'Flashcard Maker',
    description: 'Converts key terms, definitions, or facts into flip cards for active recall',
  },
  {
    id: 'quiz',
    label: 'Quiz Generator',
    description: 'Generates multiple-choice or open questions to test knowledge of the material',
  },
  {
    id: 'notes',
    label: 'Notes',
    description: 'Summarises and structures the content into clear, readable study notes',
  },
  {
    id: 'mindmap',
    label: 'Mindmap',
    description: 'Visualises how concepts connect to each other as a node/branch diagram',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    description: 'Plots events, dates, or sequential steps in chronological order',
  },
  {
    id: 'studyset',
    label: 'Studyset',
    description: 'Builds a structured multi-day study plan from this material',
  },
];

function parseJsonFromContent(content: string): any {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());
    throw new Error('Could not parse JSON from AI response');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = String(body?.text || '').trim();

    if (!text || text.length < 20) {
      return NextResponse.json({ error: 'Text is too short to analyse' }, { status: 400 });
    }

    const apiKey = resolveOpenRouterApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
    }

    // Truncate to keep the prompt cost low
    const sample = text.slice(0, 5000);

    const toolList = TOOLS.map(
      (t) => `- ${t.id}: ${t.label} — ${t.description}`
    ).join('\n');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://cautie.app',
        'X-Title': 'Cautie Tool Recommender',
      },
      body: JSON.stringify({
        model: OPENROUTER_LOCKED_MODEL,
        response_format: { type: 'json_object' },
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert study-tool recommender. You read a piece of educational text and decide which study tools would be genuinely useful. Return ONLY valid JSON — no extra text.',
          },
          {
            role: 'user',
            content: `Analyse the text below and decide which tools are appropriate.

For each tool answer:
- "recommended": true or false
- "reason": why or why not (max 10 words, be specific)
- "context": one sentence describing what the tool would produce FOR THIS SPECIFIC TEXT (max 18 words, make it concrete — e.g. "Create flip cards for the 12 cranial nerves and their functions")

Available tools:
${toolList}

Text to analyse:
"""
${sample}
"""

Return JSON in this exact shape:
{
  "tools": {
    "flashcards": { "recommended": true,  "reason": "...", "context": "..." },
    "quiz":       { "recommended": true,  "reason": "...", "context": "..." },
    "notes":      { "recommended": false, "reason": "...", "context": "..." },
    "mindmap":    { "recommended": false, "reason": "...", "context": "..." },
    "timeline":   { "recommended": false, "reason": "...", "context": "..." },
    "studyset":   { "recommended": true,  "reason": "...", "context": "..." }
  }
}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error('[tools/recommend] OpenRouter error', response.status, errBody);
      return NextResponse.json({ error: 'AI request failed' }, { status: 502 });
    }

    const data = await response.json();
    const content: string = data?.choices?.[0]?.message?.content;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    const parsed = parseJsonFromContent(content);
    return NextResponse.json({ tools: parsed?.tools ?? {} });
  } catch (err: any) {
    console.error('[tools/recommend] error', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
