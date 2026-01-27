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
      case 'image':
        const imageContent = block.content as ImageBlockContent;
        return (
          <div className="space-y-2">
            <img
              src={imageContent.url}
              alt={imageContent.caption || ''}
              className="max-w-full h-auto rounded-lg"
              style={{
                transform: `translate(${imageContent.transform.x}px, ${imageContent.transform.y}px) scale(${imageContent.transform.scale}) rotate(${imageContent.transform.rotation}deg)`,
              }}
            />
            {imageContent.caption && (
              <p className="text-sm text-muted-foreground text-center">
                {imageContent.caption}
              </p>
            )}
          </div>
        );

      case 'video':
        const videoContent = block.content as VideoBlockContent;
        if (videoContent.provider === 'youtube') {
          const videoId = videoContent.url.split('v=')[1]?.split('&')[0];
          return (
            <div className="space-y-2">
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?start=${videoContent.start_seconds}`}
                  className="w-full h-full rounded-lg"
                  allowFullScreen
                />
              </div>
            </div>
          );
        }
        return (
          <div className="text-sm text-muted-foreground">
            Video content: {videoContent.url}
          </div>
        );

      case 'media_embed':
        const embedContent = block.content as MediaEmbedContent;
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