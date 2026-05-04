'use server';

import { z } from 'genkit';
import { pickWhitelistedChannelsForTopic } from '@/lib/ai/educational-youtube-whitelist';

const VideoContextFromWhitelistInputSchema = z.object({
  sourceText: z.string(),
  limit: z.number().optional().default(5),
});

const VideoClipSchema = z.object({
  channel: z.string(),
  videoUrl: z.string(),
  startSec: z.number(),
  endSec: z.number(),
  reason: z.string(),
});

const VideoContextFromWhitelistOutputSchema = z.object({
  clips: z.array(VideoClipSchema),
});

const parseTimeHints = (text: string) => {
  const hints: number[] = [];
  const re = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/g;
  for (const match of text.matchAll(re)) {
    if (!match[0]) continue;
    if (match[3]) {
      const h = Number(match[1] || 0);
      const m = Number(match[2] || 0);
      const s = Number(match[3] || 0);
      hints.push((h * 3600) + (m * 60) + s);
    } else {
      const m = Number(match[1] || 0);
      const s = Number(match[2] || 0);
      hints.push((m * 60) + s);
    }
  }
  return hints;
};

export async function videoContextFromWhitelist(input: z.infer<typeof VideoContextFromWhitelistInputSchema>) {
  const parsed = VideoContextFromWhitelistInputSchema.parse(input);
  const channels = pickWhitelistedChannelsForTopic(parsed.sourceText || '', 8);
  const limit = Math.max(1, Math.min(10, Number(parsed.limit || 5)));
  const hints = parseTimeHints(parsed.sourceText);

  const clips = channels
    .flatMap((channel) => channel.sampleVideos.slice(0, 2).map((videoUrl, idx) => {
      const baseStart = hints[idx] ?? 30;
      const startSec = Math.max(0, baseStart);
      const endSec = startSec + 60;
      return {
        channel: channel.channel,
        videoUrl,
        startSec,
        endSec,
        reason: `Whitelisted channel match for topic ${channel.focus.slice(0, 2).join(', ')}`,
      };
    }))
    .slice(0, limit);

  return VideoContextFromWhitelistOutputSchema.parse({ clips });
}

