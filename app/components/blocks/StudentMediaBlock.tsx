'use client';

import React from 'react';
import { FileText, Download } from 'lucide-react';
import { BaseBlock, ImageBlockContent, VideoBlockContent, MediaEmbedContent } from './types';

interface StudentMediaBlockProps {
  block: BaseBlock;
  onSubmit: (answerData: any) => void;
}

export const StudentMediaBlock: React.FC<StudentMediaBlockProps> = ({
  block,
}) => {
  const renderContent = () => {
    switch (block.type) {
      case 'image': {
        const imageContent = block.data as ImageBlockContent & { alt?: string };
        if (!imageContent?.url) {
          return <div className="text-sm text-muted-foreground">No image uploaded yet.</div>;
        }
        const transform = imageContent.transform;
        return (
          <div className="space-y-2">
            <img
              src={imageContent.url}
              alt={imageContent.alt || imageContent.caption || ''}
              className="max-w-full h-auto rounded-lg"
              style={transform ? {
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
              } : undefined}
            />
            {imageContent.caption && (
              <p className="text-sm text-muted-foreground text-center">
                {imageContent.caption}
              </p>
            )}
          </div>
        );
      }

      case 'video': {
        const videoContent = block.data as VideoBlockContent & { caption?: string };
        if (!videoContent?.url) {
          return <div className="text-sm text-muted-foreground">No video uploaded yet.</div>;
        }
        const isYoutube = videoContent.provider === 'youtube'
          || /(?:youtube\.com\/watch\?v=|youtu\.be\/)/.test(videoContent.url);
        if (isYoutube) {
          const videoId = videoContent.url.includes('youtu.be/')
            ? videoContent.url.split('youtu.be/')[1]?.split('?')[0]
            : videoContent.url.split('v=')[1]?.split('&')[0];
          return (
            <div className="space-y-2">
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?start=${videoContent.start_seconds || 0}`}
                  className="w-full h-full rounded-lg"
                  allowFullScreen
                />
              </div>
              {videoContent.caption && (
                <p className="text-sm text-muted-foreground text-center">
                  {videoContent.caption}
                </p>
              )}
            </div>
          );
        }
        return (
          <div className="space-y-2">
            <video src={videoContent.url} controls className="w-full rounded-lg" />
            {videoContent.caption && (
              <p className="text-sm text-muted-foreground text-center">
                {videoContent.caption}
              </p>
            )}
          </div>
        );
      }

      case 'media_embed':
        const embedContent = block.data as MediaEmbedContent;
        return (
          <div className="space-y-2">
            <div className="aspect-video">
              <iframe
                src={embedContent.embed_url}
                className="w-full h-full rounded-lg"
                allowFullScreen
              />
            </div>
            {embedContent.description && (
              <p className="text-sm text-muted-foreground">
                {embedContent.description}
              </p>
            )}
          </div>
        );

      case 'file': {
        const fileContent = block.data as { url?: string; filename?: string; caption?: string };
        if (!fileContent?.url) {
          return <div className="text-sm text-muted-foreground">No file uploaded yet.</div>;
        }
        return (
          <div className="space-y-2">
            <a
              href={fileContent.url}
              download={fileContent.filename || true}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-lg border border-border p-3 hover:bg-[hsl(var(--interactive-hover))] transition-colors"
            >
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="flex-1 min-w-0 truncate text-sm">{fileContent.filename || 'Download file'}</span>
              <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
            </a>
            {fileContent.caption && (
              <p className="text-sm text-muted-foreground text-center">{fileContent.caption}</p>
            )}
          </div>
        );
      }

      default:
        return (
          <div className="text-sm text-muted-foreground">
            Unsupported media type: {block.type}
          </div>
        );
    }
  };

  return (
    <div className="my-4">
      {renderContent()}
    </div>
  );
};
