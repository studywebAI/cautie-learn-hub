'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lightbulb, TrendingUp, ArrowRight, AlertCircle } from 'lucide-react'

interface Idea {
  id: string
  title: string
  vote_count: number
}

export function IdeasWidget() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [quickIdea, setQuickIdea] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    const fetchIdeas = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/ideas?status=active&limit=4', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load ideas')

        const { data } = await res.json()
        setIdeas(data || [])

        // Check voted status
        const voted = new Set<string>()
        for (const idea of data || []) {
          const voteRes = await fetch(`/api/ideas/${idea.id}/vote`, { cache: 'no-store' })
          if (voteRes.ok) {
            const { voted: hasVoted } = await voteRes.json()
            if (hasVoted) voted.add(idea.id)
          }
        }
        setVotedIds(voted)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }

    void fetchIdeas()
  }, [])

  const handleQuickSubmit = async () => {
    if (!quickIdea.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: quickIdea.trim() }),
      })

      if (!res.ok) throw new Error('Failed to submit')

      setQuickIdea('')
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 2000)

      // Refresh
      const refreshRes = await fetch('/api/ideas?status=active&limit=4', { cache: 'no-store' })
      if (refreshRes.ok) {
        const { data } = await refreshRes.json()
        setIdeas(data || [])
      }
    } catch (err) {
      console.error('Submit failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const totalVotes = ideas.reduce((sum, idea) => sum + idea.vote_count, 0)
  const getPercentage = (votes: number): number => {
    if (totalVotes === 0) return 0
    return Math.round((votes / totalVotes) * 100)
  }

  const topIdeas = ideas.slice(0, 2)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Vote on features
        </CardTitle>
        <CardDescription>Share ideas & vote</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : topIdeas.length > 0 ? (
          <>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Top ideas
              </p>
              {topIdeas.map((idea) => {
                const percentage = getPercentage(idea.vote_count)
                return (
                  <div key={idea.id} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-sm font-medium line-clamp-1 mb-2">{idea.title}</p>
                    <div className="space-y-1">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent-brand)] rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{idea.vote_count} votes</span>
                        <span className="text-xs font-medium">{percentage}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-2 border-t border-border/30 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Quick share</p>
              <div className="flex gap-2">
                <Input
                  value={quickIdea}
                  onChange={(e) => setQuickIdea(e.target.value)}
                  placeholder="Your idea..."
                  maxLength={100}
                  disabled={submitting}
                  className="h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleQuickSubmit()
                  }}
                />
                <Button
                  onClick={handleQuickSubmit}
                  disabled={submitting || !quickIdea.trim()}
                  size="sm"
                  className="h-8 px-2"
                >
                  +
                </Button>
              </div>
              {submitSuccess && (
                <p className="text-xs text-green-600 dark:text-green-400">✓ Added!</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No ideas yet. Be first!
          </p>
        )}

        <Link href="/ideas" className="block">
          <Button variant="outline" className="w-full text-xs h-8">
            Go to ideas board
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
