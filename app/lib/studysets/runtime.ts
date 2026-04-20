export type StudysetStatus = 'draft' | 'active' | 'due' | 'completed' | 'archived'

const ALLOWED_TRANSITIONS: Record<StudysetStatus, StudysetStatus[]> = {
  draft: ['active', 'archived'],
  active: ['due', 'completed', 'archived'],
  due: ['active', 'completed', 'archived'],
  completed: ['active', 'archived'],
  archived: ['active'],
}

export function normalizeStudysetStatus(value: unknown): StudysetStatus {
  const raw = String(value || '').toLowerCase()
  if (raw === 'active') return 'active'
  if (raw === 'due') return 'due'
  if (raw === 'completed') return 'completed'
  if (raw === 'archived') return 'archived'
  return 'draft'
}

export function canTransitionStudysetStatus(
  from: StudysetStatus,
  to: StudysetStatus
) {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function transitionStudysetStatus(
  from: StudysetStatus,
  to: StudysetStatus
): StudysetStatus {
  if (from === to) return from
  if (canTransitionStudysetStatus(from, to)) return to

  // Safe coercions for system transitions.
  if (from === 'draft' && to === 'due') return 'active'
  if ((from === 'active' || from === 'due') && to === 'draft') return from
  if (from === 'completed' && to === 'due') return 'active'

  return from
}

export function deriveStudysetRuntimeStatus(input: {
  currentStatus: unknown
  totalTasks: number
  completedTasks: number
  hasOverduePendingTasks: boolean
}): StudysetStatus {
  const current = normalizeStudysetStatus(input.currentStatus)
  if (current === 'archived') return 'archived'

  const totalTasks = Math.max(0, Number(input.totalTasks || 0))
  const completedTasks = Math.max(0, Math.min(totalTasks, Number(input.completedTasks || 0)))
  const hasOverdue = input.hasOverduePendingTasks === true

  if (totalTasks === 0) return transitionStudysetStatus(current, 'draft')
  if (completedTasks >= totalTasks) return transitionStudysetStatus(current, 'completed')
  if (hasOverdue) return transitionStudysetStatus(current, 'due')
  return transitionStudysetStatus(current, 'active')
}

export function toLocalIsoDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

