'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, AlertCircle, Lightbulb } from 'lucide-react'
import { useIdeas } from '@/contexts/IdeasContext'

interface Idea {
  id: string
  title: string
  description: string | null
  status: 'active' | 'pending' | 'completed'
  vote_count: number
  created_at: string
}

export default function IdeasPage() {
  // Get ideas from context (fetched server-side)
  const contextIdeas = useIdeas()
  const [ideas, setIdeas] = useState<Idea[]>(contextIdeas)
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Initialize with context ideas and check votes
  useEffect(() => {
    setIdeas(contextIdeas)

    // Check which ideas the user voted on
    const checkVotes = async () => {
      const voted = new Set<string>()
      for (const idea of contextIdeas) {
        try {
          const voteRes = await fetch(`/api/ideas/${idea.id}/vote`, { cache: 'no-store' })
          if (voteRes.ok) {
            const { voted: hasVoted } = await voteRes.json()
            if (hasVoted) voted.add(idea.id)
          }
        } catch (err) {
          console.error('Vote check error:', err)
        }
      }
      setVotedIds(voted)
    }

    void checkVotes()
  }, [contextIdeas])

  // Handle idea submission
  const handleSubmitIdea = async () => {
    if (!title.trim()) {
      setSubmitError('Please enter an idea title')
      return
    }

    setSubmitting(true)
    setSubmitError('')
    setSubmitSuccess(false)

    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
        }),
      })

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed to submit' }))
        throw new Error(error)
      }

      setTitle('')
      setDescription('')
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)

      // Refresh ideas
      const refreshRes = await fetch('/api/ideas?status=active', { cache: 'no-store' })
      if (refreshRes.ok) {
        const { data } = await refreshRes.json()
        setIdeas(data || [])
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit idea')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle voting on an idea
  const handleVote = async (ideaId: string) => {
    if (votedIds.has(ideaId)) return

    try {
      const res = await fetch(`/api/ideas/${ideaId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed to vote' }))
        throw new Error(error)
      }

      setVotedIds(new Set([...votedIds, ideaId]))

      // Update vote count
      setIdeas(
        ideas.map((idea) =>
          idea.id === ideaId ? { ...idea, vote_count: idea.vote_count + 1 } : idea
        )
      )
    } catch (err) {
      console.error('Vote error:', err)
    }
  }

  const getTotalVotes = (): number => ideas.reduce((sum, idea) => sum + idea.vote_count, 0)

  const getPercentage = (votes: number): number => {
    const total = getTotalVotes()
    if (total === 0) return 0
    return Math.round((votes / total) * 100)
  }

  const activeIdeas = ideas.filter((idea) => idea.status === 'active')
  const completedIdeas = ideas.filter((idea) => idea.status === 'completed')

  return (
    <div className="page-content space-y-6">
      <div className="space-y-1">
        <h1 className="page-title">Ideas & feature requests</h1>
        <p className="text-muted-foreground">Vote on features you'd like to see, or submit your own idea</p>
      </div>

      {error && (
        <div className="flex gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Poll section (left) */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What feature should we build next?</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : activeIdeas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No active polls yet. Be the first to submit an idea!
                </p>
              ) : (
                <div className="space-y-3">
                  {activeIdeas.slice(0, 4).map((idea) => {
                    const percentage = getPercentage(idea.vote_count)
                    const hasVoted = votedIds.has(idea.id)

                    return (
                      <button
                        key={idea.id}
                        onClick={() => handleVote(idea.id)}
                        disabled={hasVoted}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          hasVoted
                            ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]/5'
                            : 'border-border hover:border-border/80 hover:bg-muted/50'
                        } disabled:cursor-not-allowed`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-medium text-sm leading-snug">{idea.title}</span>
                          {hasVoted && <Check className="h-4 w-4 text-[var(--accent-brand)] shrink-0" />}
                        </div>

                        {hasVoted ? (
                          <div className="space-y-1">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--accent-brand)] rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">{idea.vote_count} votes</span>
                              <span className="text-xs font-medium">{percentage}%</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground italic">
                            Vote to see results
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Submit form section (right) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Have an idea?
              </CardTitle>
              <CardDescription>Share your feature suggestion</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {submitError && (
                <div className="flex gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{submitError}</p>
                </div>
              )}

              {submitSuccess && (
                <div className="flex gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Thanks! Your idea has been submitted.
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Feature title..."
                  maxLength={255}
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground mt-1">{title.length}/255</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description (optional)</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us more..."
                  maxLength={500}
                  disabled={submitting}
                  className="min-h-24"
                />
                <p className="text-xs text-muted-foreground mt-1">{description.length}/500</p>
              </div>

              <Button
                onClick={handleSubmitIdea}
                disabled={submitting || !title.trim()}
                className="w-full"
              >
                {submitting ? 'Submitting...' : 'Submit idea'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* We already implemented section */}
      {completedIdeas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              We already implemented
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedIdeas.map((idea) => (
                <div key={idea.id} className="p-4 rounded-lg border border-border/50">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{idea.title}</h4>
                      {idea.description && (
                        <p className="text-sm text-muted-foreground mt-1">{idea.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
