'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

export default function IdeasBoardPage() {
  const [ideas, setIdeas] = useState<IdeaItem[]>([])
  const [polls, setPolls] = useState<PollItem[]>([])
  const [pollOptions, setPollOptions] = useState<PollOption[]>([])
  const [myPollVotes, setMyPollVotes] = useState<Array<{ poll_id: string; option_id: string }>>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [submittingIdea, setSubmittingIdea] = useState(false)
  const [votingPollId, setVotingPollId] = useState<string | null>(null)

  const loadBoard = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ideas-board', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      setIdeas(Array.isArray(payload?.ideas) ? payload.ideas : [])
      setPolls(Array.isArray(payload?.polls) ? payload.polls : [])
      setPollOptions(Array.isArray(payload?.pollOptions) ? payload.pollOptions : [])
      setMyPollVotes(Array.isArray(payload?.myPollVotes) ? payload.myPollVotes : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadBoard()
  }, [])

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

  const myVoteOptionId = activePoll ? myPollVotes.find((vote) => vote.poll_id === activePoll.id)?.option_id : undefined

  return (
    <div className="page-content">
      <div className="space-y-3">
      <div className="rounded-md surface-panel p-4">
        <h1 className="text-xl">Ideas Board</h1>
        <p className="mt-1 text-sm text-muted-foreground">Submit ideas and vote on the top 3 poll options.</p>
      </div>

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
      </div>
    </div>
  )
}
