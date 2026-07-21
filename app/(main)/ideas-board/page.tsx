'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/page-header'

type IdeaItem = {
  id: string
  title: string
  description: string | null
  lifecycle_stage: 'submitted' | 'candidate' | 'planned' | 'rejected' | 'shipped'
}

type PollItem = {
  id: string
  title: string
  status: 'draft' | 'open' | 'closed' | 'archived'
}

type PollOption = {
  id: string
  poll_id: string
  title: string
  vote_count: number
  position: number
}

type AuditLogEntry = {
  id: string
  action: string
  entity_type: 'idea' | 'poll'
  entity_id: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  created_at: string
  actor: { display_name: string }
}

export default function IdeasBoardPage() {
  const [ideas, setIdeas] = useState<IdeaItem[]>([])
  const [polls, setPolls] = useState<PollItem[]>([])
  const [pollOptions, setPollOptions] = useState<PollOption[]>([])
  const [myPollVotes, setMyPollVotes] = useState<Array<{ poll_id: string; option_id: string }>>([])
  const [canManagePolls, setCanManagePolls] = useState(false)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [submittingIdea, setSubmittingIdea] = useState(false)
  const [votingPollId, setVotingPollId] = useState<string | null>(null)
  const [rotatePollStatus, setRotatePollStatus] = useState<string>('')
  const [rotatingPoll, setRotatingPoll] = useState(false)
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [auditLogLoaded, setAuditLogLoaded] = useState(false)

  const loadBoard = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ideas-board', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      setIdeas(Array.isArray(payload?.ideas) ? payload.ideas : [])
      setPolls(Array.isArray(payload?.polls) ? payload.polls : [])
      setPollOptions(Array.isArray(payload?.pollOptions) ? payload.pollOptions : [])
      setMyPollVotes(Array.isArray(payload?.myPollVotes) ? payload.myPollVotes : [])
      setCanManagePolls(Boolean(payload?.canManagePolls))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadBoard()
  }, [])

  const loadAuditLog = async () => {
    try {
      const response = await fetch('/api/ideas-board/admin/audit-log?limit=30', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      setAuditLog(Array.isArray(payload?.entries) ? payload.entries : [])
    } finally {
      setAuditLogLoaded(true)
    }
  }

  useEffect(() => {
    if (canManagePolls && !auditLogLoaded) void loadAuditLog()
  }, [canManagePolls, auditLogLoaded])

  const activePoll = useMemo(() => polls.find((poll) => poll.status === 'open') || null, [polls])
  const activePollOptions = useMemo(
    () =>
      activePoll
        ? pollOptions
            .filter((option) => option.poll_id === activePoll.id)
            .sort((a, b) => a.position - b.position)
            .slice(0, 3)
        : [],
    [activePoll, pollOptions]
  )
  const pendingIdeas = useMemo(
    () => ideas.filter((idea) => idea.lifecycle_stage === 'submitted').slice(0, 8),
    [ideas]
  )

  const submitIdea = async () => {
    if (!title.trim()) return
    setSubmittingIdea(true)
    try {
      await fetch('/api/ideas-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: '' }),
      })
      setTitle('')
      await loadBoard()
    } finally {
      setSubmittingIdea(false)
    }
  }

  const votePoll = async (pollId: string, optionId: string) => {
    setVotingPollId(pollId)
    try {
      await fetch(`/api/ideas-board/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId }),
      })
      await loadBoard()
    } finally {
      setVotingPollId(null)
    }
  }

  const rotatePoll = async () => {
    if (!window.confirm('Close the current open poll and prepare for next month? This cannot be undone.')) return
    setRotatingPoll(true)
    setRotatePollStatus('')
    try {
      const res = await fetch('/api/ideas-board/admin/rotate-poll', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Rotation failed')
      setRotatePollStatus(`Done — ${data.closed_count} poll(s) closed. Next month key: ${data.next_month_key}`)
      await loadBoard()
      await loadAuditLog()
    } catch (e: any) {
      setRotatePollStatus(e?.message || 'Failed')
    } finally {
      setRotatingPoll(false)
    }
  }

  const myVoteOptionId = activePoll ? myPollVotes.find((vote) => vote.poll_id === activePoll.id)?.option_id : undefined

  return (
    <div className="page-content">
      <div className="space-y-3">
      <PageHeader title="Ideas Board" subtitle="Submit ideas and vote on the top 3 poll options." />

      <div className="rounded-md surface-panel p-4">
        <h2 className="mb-2 text-sm">Send in idea</h2>
        <div className="flex gap-2">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Type your idea"
            maxLength={160}
          />
          <Button onClick={submitIdea} disabled={submittingIdea || !title.trim()}>
            Send
          </Button>
        </div>
      </div>

      <div className="rounded-md surface-panel p-4">
        <h2 className="mb-2 text-sm">Current poll (3 options)</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !activePoll ? (
          <p className="text-sm text-muted-foreground">No open poll yet.</p>
        ) : activePollOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No options yet.</p>
        ) : (
          <div className="space-y-2">
            {activePollOptions.map((option) => (
              <div key={option.id} className="flex items-center justify-between rounded-md surface-interactive px-3 py-2">
                <p className="text-sm">{option.title}</p>
                <Button
                  size="sm"
                  variant={myVoteOptionId === option.id ? 'default' : 'outline'}
                  disabled={Boolean(myVoteOptionId) || votingPollId === activePoll.id}
                  onClick={() => void votePoll(activePoll.id, option.id)}
                >
                  {option.vote_count}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md surface-panel p-4">
        <h2 className="mb-2 text-sm">Ideas waiting for review</h2>
        {pendingIdeas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submitted ideas right now.</p>
        ) : (
          <div className="space-y-2">
            {pendingIdeas.map((idea) => (
              <div key={idea.id} className="rounded-md surface-interactive px-3 py-2">
                <p className="text-sm">{idea.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {canManagePolls && (
        <div className="rounded-md border border-border surface-panel p-4 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium">Admin controls</h2>
            <Badge variant="secondary" className="text-[11px]">admin</Badge>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Monthly rotation: closes the current open poll so you can create a fresh one for next month. Admins receive an in-app notification when ideas are submitted or a poll is rotated.
            </p>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                disabled={rotatingPoll || !activePoll}
                onClick={() => void rotatePoll()}
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                {rotatingPoll ? 'Rotating...' : 'Rotate poll (close & prepare next month)'}
              </Button>
              {!activePoll && !rotatingPoll && (
                <span className="text-xs text-muted-foreground">No open poll to rotate.</span>
              )}
            </div>
            {rotatePollStatus && (
              <p className="text-xs text-muted-foreground">{rotatePollStatus}</p>
            )}
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <h3 className="text-xs text-muted-foreground">Recent admin actions</h3>
            {auditLog.length === 0 ? (
              <p className="text-xs text-muted-foreground">No admin actions logged yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-auto pr-1">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-2 rounded-md surface-interactive px-2.5 py-1.5 text-xs">
                    <span className="text-foreground/85">
                      {entry.action.replace(/_/g, ' ')} <span className="text-muted-foreground">({entry.entity_type})</span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {entry.actor.display_name} · {new Date(entry.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
