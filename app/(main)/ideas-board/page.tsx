'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ThumbsUp } from 'lucide-react'

type IdeaItem = {
  id: string
  created_by: string
  title: string
  description: string | null
  status: string
  lifecycle_stage: 'submitted' | 'candidate' | 'planned' | 'rejected' | 'shipped'
  vote_count: number
}

type PollItem = {
  id: string
  title: string
  description: string | null
  month_key: string
  status: 'draft' | 'open' | 'closed' | 'archived'
}

type PollOption = {
  id: string
  poll_id: string
  idea_id: string | null
  title: string
  description: string | null
  vote_count: number
  position: number
}

type PollVote = {
  poll_id: string
  option_id: string
}

export default function IdeasBoardPage() {
  const [ideas, setIdeas] = useState<IdeaItem[]>([])
  const [polls, setPolls] = useState<PollItem[]>([])
  const [pollOptions, setPollOptions] = useState<PollOption[]>([])
  const [myPollVotes, setMyPollVotes] = useState<PollVote[]>([])
  const [canManagePolls, setCanManagePolls] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [submittingIdea, setSubmittingIdea] = useState(false)
  const [votingCandidateId, setVotingCandidateId] = useState<string | null>(null)
  const [promotingId, setPromotingId] = useState<string | null>(null)
  const [votingPollId, setVotingPollId] = useState<string | null>(null)

  const [pollTitle, setPollTitle] = useState('')
  const [pollDescription, setPollDescription] = useState('')
  const [pollMonth, setPollMonth] = useState(() => {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return month
  })
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([])
  const [creatingPoll, setCreatingPoll] = useState(false)

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

  const submittedIdeas = useMemo(
    () => ideas.filter((idea) => idea.lifecycle_stage === 'submitted'),
    [ideas]
  )

  const candidateIdeas = useMemo(
    () => ideas
      .filter((idea) => idea.lifecycle_stage === 'candidate')
      .sort((a, b) => (b.vote_count - a.vote_count)),
    [ideas]
  )

  const roadmapIdeas = useMemo(
    () =>
      ideas
        .filter((idea) => ['planned', 'shipped'].includes(idea.lifecycle_stage))
        .sort((a, b) => (b.vote_count - a.vote_count)),
    [ideas]
  )

  const submitIdea = async () => {
    if (!title.trim()) return
    setSubmittingIdea(true)
    try {
      await fetch('/api/ideas-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      })
      setTitle('')
      setDescription('')
      await loadBoard()
    } finally {
      setSubmittingIdea(false)
    }
  }

  const voteCandidateIdea = async (ideaId: string) => {
    setVotingCandidateId(ideaId)
    try {
      await fetch(`/api/ideas-board/${ideaId}/vote`, { method: 'POST' })
      await loadBoard()
    } finally {
      setVotingCandidateId(null)
    }
  }

  const promoteIdea = async (ideaId: string) => {
    setPromotingId(ideaId)
    try {
      await fetch(`/api/ideas-board/${ideaId}/promote`, { method: 'POST' })
      await loadBoard()
    } finally {
      setPromotingId(null)
    }
  }

  const createPoll = async () => {
    if (!pollTitle.trim()) return
    if (selectedCandidateIds.length < 2) return
    setCreatingPoll(true)
    try {
      await fetch('/api/ideas-board/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pollTitle.trim(),
          description: pollDescription.trim(),
          monthKey: pollMonth,
          optionIdeaIds: selectedCandidateIds,
        }),
      })
      setPollTitle('')
      setPollDescription('')
      setSelectedCandidateIds([])
      await loadBoard()
    } finally {
      setCreatingPoll(false)
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

  const setIdeaStage = async (
    ideaId: string,
    lifecycleStage: 'planned' | 'shipped' | 'candidate' | 'rejected' | 'submitted'
  ) => {
    setPromotingId(ideaId)
    try {
      await fetch(`/api/ideas-board/${ideaId}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lifecycleStage }),
      })
      await loadBoard()
    } finally {
      setPromotingId(null)
    }
  }

  const setPollStatus = async (pollId: string, status: 'open' | 'closed' | 'archived' | 'draft') => {
    setVotingPollId(pollId)
    try {
      await fetch(`/api/ideas-board/polls/${pollId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await loadBoard()
    } finally {
      setVotingPollId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md surface-panel p-4">
        <h1 className="text-xl">Ideas Board</h1>
        <p className="mt-1 text-sm text-muted-foreground">Community ideas to poll ideas to monthly poll to shipped.</p>
      </div>

      <div className="rounded-md surface-panel p-4">
        <h2 className="mb-2 text-sm">Submit an idea</h2>
        <div className="grid gap-2">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Idea title" maxLength={120} />
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What should we add and why?" rows={3} maxLength={500} />
          <div className="flex justify-end">
            <Button onClick={submitIdea} disabled={submittingIdea || !title.trim()}>Submit idea</Button>
          </div>
        </div>
      </div>

      <div className="rounded-md surface-panel p-4">
        <h2 className="mb-2 text-sm">Ideas waiting for review</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : submittedIdeas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submitted ideas right now.</p>
        ) : (
          <div className="space-y-2">
            {submittedIdeas.map((idea) => (
              <div key={idea.id} className="rounded-md surface-interactive p-3">
                <p className="text-sm">{idea.title}</p>
                {idea.description ? <p className="mt-1 text-sm text-muted-foreground">{idea.description}</p> : null}
                {canManagePolls ? (
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" variant="outline" disabled={promotingId === idea.id} onClick={() => void promoteIdea(idea.id)}>
                      Move to Poll Candidates
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md surface-panel p-4">
        <h2 className="mb-2 text-sm">Poll candidates (community voting)</h2>
        {candidateIdeas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No candidates yet.</p>
        ) : (
          <div className="space-y-2">
            {candidateIdeas.map((idea) => (
              <div key={idea.id} className="rounded-md surface-interactive p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm">{idea.title}</p>
                    {idea.description ? <p className="mt-1 text-sm text-muted-foreground">{idea.description}</p> : null}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={votingCandidateId === idea.id}
                    onClick={() => void voteCandidateIdea(idea.id)}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {idea.vote_count}
                  </Button>
                </div>
                {canManagePolls ? (
                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="outline" disabled={promotingId === idea.id} onClick={() => void setIdeaStage(idea.id, 'planned')}>
                      Mark Planned
                    </Button>
                    <Button size="sm" variant="outline" disabled={promotingId === idea.id} onClick={() => void setIdeaStage(idea.id, 'rejected')}>
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {canManagePolls ? (
        <div className="rounded-md surface-panel p-4">
          <h2 className="mb-2 text-sm">Admin: Create monthly poll</h2>
          <div className="grid gap-2">
            <Input value={pollTitle} onChange={(event) => setPollTitle(event.target.value)} placeholder="Poll title (e.g. May 2026 Feature Poll)" />
            <Input value={pollMonth} onChange={(event) => setPollMonth(event.target.value)} placeholder="YYYY-MM" />
            <Textarea value={pollDescription} onChange={(event) => setPollDescription(event.target.value)} placeholder="Optional poll description" rows={2} />
            <div className="rounded-md surface-interactive p-3">
              <p className="mb-2 text-xs text-muted-foreground">Select at least 2 candidate ideas</p>
              <div className="space-y-1">
                {candidateIdeas.map((idea) => {
                  const selected = selectedCandidateIds.includes(idea.id)
                  return (
                    <button
                      key={`pick-${idea.id}`}
                      type="button"
                      className={`w-full rounded-md px-2 py-2 text-left text-sm ${selected ? 'surface-chip' : 'hover:surface-chip'}`}
                      onClick={() => {
                        setSelectedCandidateIds((prev) =>
                          selected ? prev.filter((id) => id !== idea.id) : [...prev, idea.id]
                        )
                      }}
                    >
                      {idea.title}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={createPoll} disabled={creatingPoll || !pollTitle.trim() || selectedCandidateIds.length < 2}>
                Create Poll
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-md surface-panel p-4">
        <h2 className="mb-2 text-sm">Monthly polls</h2>
        {polls.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open polls right now.</p>
        ) : (
          <div className="space-y-3">
            {polls.map((poll) => {
              const options = pollOptions
                .filter((option) => option.poll_id === poll.id)
                .sort((a, b) => a.position - b.position)
              const myVote = myPollVotes.find((vote) => vote.poll_id === poll.id)
              return (
                <div key={poll.id} className="rounded-md surface-interactive p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm">{poll.title}</p>
                    <span className="rounded-md surface-chip px-2 py-1 text-xs uppercase tracking-wide">{poll.status}</span>
                  </div>
                  {poll.description ? <p className="mt-1 text-sm text-muted-foreground">{poll.description}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">Month: {poll.month_key}</p>
                  <div className="mt-2 space-y-1">
                    {options.map((option) => (
                      <div key={option.id} className="flex items-center justify-between rounded-md surface-panel px-2 py-2">
                        <div className="min-w-0">
                          <p className="text-sm">{option.title}</p>
                          {option.description ? <p className="text-xs text-muted-foreground">{option.description}</p> : null}
                        </div>
                        <Button
                          size="sm"
                          variant={myVote?.option_id === option.id ? 'default' : 'outline'}
                          disabled={Boolean(myVote) || votingPollId === poll.id || poll.status !== 'open'}
                          onClick={() => void votePoll(poll.id, option.id)}
                        >
                          {option.vote_count}
                        </Button>
                      </div>
                    ))}
                  </div>
                  {canManagePolls ? (
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      {poll.status !== 'open' ? (
                        <Button size="sm" variant="outline" disabled={votingPollId === poll.id} onClick={() => void setPollStatus(poll.id, 'open')}>
                          Open
                        </Button>
                      ) : null}
                      {poll.status === 'open' ? (
                        <Button size="sm" variant="outline" disabled={votingPollId === poll.id} onClick={() => void setPollStatus(poll.id, 'closed')}>
                          Close
                        </Button>
                      ) : null}
                      {poll.status !== 'archived' ? (
                        <Button size="sm" variant="outline" disabled={votingPollId === poll.id} onClick={() => void setPollStatus(poll.id, 'archived')}>
                          Archive
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-md surface-panel p-4">
        <h2 className="mb-2 text-sm">Roadmap results</h2>
        {roadmapIdeas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No roadmap items yet.</p>
        ) : (
          <div className="space-y-2">
            {roadmapIdeas.map((idea) => (
              <div key={`roadmap-${idea.id}`} className="rounded-md surface-interactive p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm">{idea.title}</p>
                  <span className="rounded-md surface-chip px-2 py-1 text-xs uppercase tracking-wide">{idea.lifecycle_stage}</span>
                </div>
                {idea.description ? <p className="mt-1 text-sm text-muted-foreground">{idea.description}</p> : null}
                {canManagePolls ? (
                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                    {idea.lifecycle_stage !== 'planned' ? (
                      <Button size="sm" variant="outline" disabled={promotingId === idea.id} onClick={() => void setIdeaStage(idea.id, 'planned')}>
                        Set Planned
                      </Button>
                    ) : null}
                    {idea.lifecycle_stage !== 'shipped' ? (
                      <Button size="sm" variant="outline" disabled={promotingId === idea.id} onClick={() => void setIdeaStage(idea.id, 'shipped')}>
                        Set Shipped
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
