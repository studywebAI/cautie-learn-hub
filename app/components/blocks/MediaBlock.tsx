'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BlockProps, ImageBlockContent, VideoBlockContent, MediaEmbedContent } from './types';
import { cn } from '@/lib/utils';

interface MediaBlockProps extends BlockProps {
  block: BlockProps['block'];
}

export const MediaBlock: React.FC<MediaBlockProps> = ({
  block,
  onUpdate,
  isEditing = false,
  className,
}) => {
  const [isEditingState, setIsEditingState] = useState(isEditing);
  const [url, setUrl] = useState((block.content as any).url || (block.content as any).embed_url || '');
  const [alt, setAlt] = useState((block.content as any).alt || '');
  const [caption, setCaption] = useState((block.content as any).caption || (block.content as any).description || '');

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        ...block.content,
        url,
        alt,
        caption,
      });
    }
    setIsEditingState(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setUrl((block.content as any).url || (block.content as any).embed_url || '');
      setAlt((block.content as any).alt || '');
      setCaption((block.content as any).caption || (block.content as any).description || '');
      setIsEditingState(false);
    }
  };

  const renderImage = () => {
    if (!url) {
      return (
        <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
          No image URL provided
        </div>
      );
    }

    return (
      <div className="w-full">
        <img
          src={url}
          alt={alt || 'Image'}
          className="w-full h-auto rounded-lg max-w-full"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.innerHTML = '<div class="w-full h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">Failed to load image</div>';
            }
          }}
        />
        {caption && (
          <p className="text-sm text-muted-foreground mt-2 text-center">{caption}</p>
        )}
      </div>
    );
  };

  const renderEmbed = () => {
    if (!url) {
      return (
        <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
          No embed URL provided
        </div>
      );
    }

    // Enhanced embed handling for multiple platforms
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
      if (videoId) {
        return (
          <div className="w-full">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                allowFullScreen
                title="Embedded YouTube video"
              />
            </div>
            {caption && (
              <p className="text-sm text-muted-foreground mt-2 text-center">{caption}</p>
            )}
          </div>
        );
      }
    }

    if (url.includes('vimeo.com')) {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      if (videoId) {
        return (
          <div className="w-full">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`https://player.vimeo.com/video/${videoId}`}
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                allowFullScreen
                title="Embedded Vimeo video"
              />
            </div>
            {caption && (
              <p className="text-sm text-muted-foreground mt-2 text-center">{caption}</p>
            )}
          </div>
        );
      }
    }

    if (url.includes('twitter.com') || url.includes('x.com')) {
      const tweetId = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/)?.[1];
      if (tweetId) {
        return (
          <div className="w-full">
            <blockquote className="twitter-tweet" data-theme="light">
              <a href={url}></a>
            </blockquote>
            <script async src="https://platform.twitter.com/widgets.js"></script>
            {caption && (
              <p className="text-sm text-muted-foreground mt-2 text-center">{caption}</p>
            )}
          </div>
        );
      }
    }

    if (url.includes('github.com')) {
      const repoMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (repoMatch) {
        const [, owner, repo] = repoMatch;
        return (
          <div className="w-full">
            <div className="github-repo-card bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">{owner[0].toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="font-semibold">{owner}/{repo}</h3>
                  <p className="text-sm text-gray-600">GitHub Repository</p>
                </div>
              </div>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm mt-2 inline-block">
                View on GitHub →
              </a>
            </div>
            {caption && (
              <p className="text-sm text-muted-foreground mt-2 text-center">{caption}</p>
            )}
          </div>
        );
      }
    }

    // Generic iframe for other embeds with security considerations
    return (
      <div className="w-full">
        <iframe
          src={url}
          className="w-full h-64 rounded-lg border"
          title="Embedded content"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
        {caption && (
          <p className="text-sm text-muted-foreground mt-2 text-center">{caption}</p>
        )}
      </div>
    );
  };

  const renderDisplay = () => {
    const { type } = block.content;

    if (type === 'image') {
      return renderImage();
    }

    return renderEmbed();
  };

  const renderEditor = () => {
    return (
      <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
        <div>
          <label className="text-sm font-medium">URL</label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter media URL..."
            className="mt-1"
            autoFocus
          />
        </div>
        {block.content.type === 'image' && (
          <div>
            <label className="text-sm font-medium">Alt Text</label>
            <Input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the image..."
              className="mt-1"
            />
          </div>
        )}
        <div>
          <label className="text-sm font-medium">Caption</label>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a caption..."
            className="mt-1 min-h-[60px] resize-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
          >
            Save
          </button>
          <button
            onClick={() => setIsEditingState(false)}
            className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn('w-full mb-4', className)}
      onClick={() => !isEditingState && setIsEditingState(true)}
    >
      {isEditingState ? renderEditor() : renderDisplay()}
    </div>
  );
};