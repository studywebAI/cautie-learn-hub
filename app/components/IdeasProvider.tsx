import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { IdeasProvider } from '@/contexts/IdeasContext'

interface Idea {
  id: string
  title: string
  description: string | null
  status: 'active' | 'pending' | 'completed'
  vote_count: number
  created_at: string
}

// Queries Supabase directly instead of fetching this app's own /api/ideas
// route over HTTP -- that self-fetch needed an absolute base URL
// (NEXT_PUBLIC_APP_URL), fell back to http://localhost:3000 when unset,
// and failed with ECONNREFUSED on every request in production.
export async function IdeasProviderWrapper({ children }: { children: React.ReactNode }) {
  let ideas: Idea[] = []

  try {
    const supabase = await createClient(cookies())
    const { data, error } = await supabase
      .from('ideas')
      .select('id, title, description, status, created_at, votes(count)')
      .eq('is_in_poll', true)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      ideas = data.map((idea: any) => ({
        ...idea,
        vote_count: idea.votes?.[0]?.count || 0,
      }))
    }
  } catch (error) {
    console.error('[IdeasProviderWrapper] Failed to fetch ideas:', error)
  }

  return <IdeasProvider ideas={ideas}>{children}</IdeasProvider>
}
