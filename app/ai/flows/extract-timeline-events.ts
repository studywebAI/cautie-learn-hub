'use server';

import { z } from 'genkit';

const ExtractTimelineEventsInputSchema = z.object({
  sourceText: z.string(),
  maxEvents: z.number().optional().default(24),
});

const TimelineEventSchema = z.object({
  year: z.number().nullable(),
  start: z.string().nullable(),
  end: z.string().nullable(),
  label: z.string(),
  source: z.string(),
});

const ExtractTimelineEventsOutputSchema = z.object({
  events: z.array(TimelineEventSchema),
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

const lineSplit = (value: string) =>
  String(value || '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

const parseYear = (line: string): number | null => {
  const match = line.match(/\b(1[5-9]\d{2}|20\d{2}|2100)\b/);
  return match ? Number(match[1]) : null;
};

const parseDateRange = (line: string) => {
  const range = line.match(/\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\s*(?:-|to|tot|until)\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b/i);
  if (range) return { start: range[1], end: range[2] };
  const single = line.match(/\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b/);
  if (single) return { start: single[1], end: null };
  return { start: null, end: null };
};

export async function extractTimelineEvents(input: z.infer<typeof ExtractTimelineEventsInputSchema>) {
  const parsed = ExtractTimelineEventsInputSchema.parse(input);
  const lines = lineSplit(parsed.sourceText).slice(0, 400);
  const seen = new Set<string>();
  const events: TimelineEvent[] = [];

  for (const line of lines) {
    const year = parseYear(line);
    const { start, end } = parseDateRange(line);
    if (year === null && !start) continue;
    const label = line.length > 180 ? `${line.slice(0, 177)}...` : line;
    const key = `${year || ''}|${start || ''}|${end || ''}|${label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push({
      year,
      start,
      end,
      label,
      source: 'sourceText',
    });
    if (events.length >= parsed.maxEvents) break;
  }

  events.sort((a, b) => {
    const ay = a.year ?? Number.MAX_SAFE_INTEGER;
    const by = b.year ?? Number.MAX_SAFE_INTEGER;
    if (ay !== by) return ay - by;
    return a.label.localeCompare(b.label);
  });

  return ExtractTimelineEventsOutputSchema.parse({ events });
}

