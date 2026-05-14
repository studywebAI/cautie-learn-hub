'use client'

import { Card } from '@/components/ui/card'
import { sanitizeHtml, sanitizeEmbedUrl, generateSafeIframeHtml } from '@/lib/sanitize'

interface MediaEmbedBlockProps {
  data: {
    embed_url: string
    description: string
  }
}

export function MediaEmbedBlock({ data }: MediaEmbedBlockProps) {
  // Extract video ID safely from YouTube/Vimeo URLs
  const getYouTubeVideoId = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com')) {
        return urlObj.searchParams.get('v');
      }
      if (urlObj.hostname.includes('youtu.be')) {
        return urlObj.pathname.split('/')[1];
      }
    } catch {
      return null;
    }
    return null;
  };

  const getVimeoVideoId = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('vimeo.com')) {
        return urlObj.pathname.split('/').pop() || null;
      }
    } catch {
      return null;
    }
    return null;
  };

  const getEmbedHtml = (url: string): string => {
    if (!url) return '';

    // Try YouTube
    const youtubeId = getYouTubeVideoId(url);
    if (youtubeId) {
      const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}`;
      return generateSafeIframeHtml(embedUrl);
    }

    // Try Vimeo
    const vimeoId = getVimeoVideoId(url);
    if (vimeoId) {
      const embedUrl = `https://player.vimeo.com/video/${encodeURIComponent(vimeoId)}`;
      return generateSafeIframeHtml(embedUrl);
    }

    // For other URLs, validate against whitelist
    const sanitized = sanitizeEmbedUrl(url);
    if (sanitized) {
      return generateSafeIframeHtml(sanitized);
    }

    // Blocked unsafe URL
    return '';
  };

  const embedHtml = getEmbedHtml(data.embed_url);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {data.description && (
          <p className="text-sm text-gray-600">{sanitizeHtml(data.description)}</p>
        )}
        {embedHtml && (
          <div
            className="embed-container"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(embedHtml) }}
          />
        )}
        {!embedHtml && data.embed_url && (
          <div className="text-sm text-red-600">Invalid or unsupported embed URL</div>
        )}
      </div>
    </Card>
  )
}
