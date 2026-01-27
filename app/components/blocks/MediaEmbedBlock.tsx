'use client'

import { Card } from '@/components/ui/card'

interface MediaEmbedBlockProps {
  data: {
    embed_url: string
    description: string
  }
}

export function MediaEmbedBlock({ data }: MediaEmbedBlockProps) {
  const getEmbedHtml = (url: string) => {
    // Simple embed logic - in reality, you'd parse different providers
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.split('v=')[1] || url.split('/').pop()
      return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`
    }
    if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop()
      return `<iframe src="https://player.vimeo.com/video/${videoId}" width="560" height="315" frameborder="0" allowfullscreen></iframe>`
    }
    // Default to iframe
    return `<iframe src="${url}" width="560" height="315" frameborder="0"></iframe>`
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {data.description && (
          <p className="text-sm text-gray-600">{data.description}</p>
        )}
        <div
          className="embed-container"
          dangerouslySetInnerHTML={{ __html: getEmbedHtml(data.embed_url) }}
        />
      </div>
    </Card>
  )
}