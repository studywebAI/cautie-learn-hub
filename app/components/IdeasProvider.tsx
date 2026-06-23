import { IdeasProvider } from '@/contexts/IdeasContext'

interface Idea {
  id: string
  title: string
  description: string | null
  status: 'active' | 'pending' | 'completed'
  vote_count: number
  created_at: string
}

export async function IdeasProviderWrapper({ children }: { children: React.ReactNode }) {
  let ideas: Idea[] = []

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9003'
    const res = await fetch(`${baseUrl}/api/ideas?status=active`, {
      cache: 'no-store',
    })

    if (res.ok) {
      const { data } = await res.json()
      ideas = data || []
    }
  } catch (error) {
    console.error('[IdeasProviderWrapper] Failed to fetch ideas:', error)
  }

  return <IdeasProvider ideas={ideas}>{children}</IdeasProvider>
}
