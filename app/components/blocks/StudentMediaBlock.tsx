'use client';

import React from 'react';
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
