'use server';

import { z } from 'genkit';
import { extractTimelineEvents } from '@/ai/flows/extract-timeline-events';

const BuildTimelineQuizContextInputSchema = z.object({
  sourceText: z.string(),
  maxMarkers: z.number().optional().default(12),
});

const TimelineMarkerSchema = z.object({
  marker: z.string(),
  label: z.string(),
  year: z.number().nullable(),
  start: z.string().nullable(),
  end: z.string().nullable(),
});

const BuildTimelineQuizContextOutputSchema = z.object({
  markers: z.array(TimelineMarkerSchema),
  contextBlock: z.string(),
  suggestedQuestions: z.array(z.string()),
});

export async function buildTimelineQuizContext(input: z.infer<typeof BuildTimelineQuizContextInputSchema>) {
  const parsed = BuildTimelineQuizContextInputSchema.parse(input);
  const extracted = await extractTimelineEvents({
    sourceText: parsed.sourceText,
    maxEvents: Math.max(6, parsed.maxMarkers),
  });

  const markers = extracted.events.slice(0, parsed.maxMarkers).map((event, idx) => ({
    marker: `T${idx + 1}`,
    label: event.label,
    year: event.year,
    start: event.start,
    end: event.end,
  }));

  const contextLines = markers.map((marker) => {
    const when = marker.year ? String(marker.year) : (marker.start ? `${marker.start}${marker.end ? ` -> ${marker.end}` : ''}` : 'unknown-date');
    return `${marker.marker} | ${when} | ${marker.label}`;
  });

  const suggestedQuestions = markers.slice(0, 8).map((marker) =>
    `What happened at marker ${marker.marker} on the timeline?`
  );

  return BuildTimelineQuizContextOutputSchema.parse({
    markers,
    contextBlock: contextLines.join('\n'),
    suggestedQuestions,
  });
}

