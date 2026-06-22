'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NotesReminderProps {
  topicId: string
  topicName: string
  className?: string
}

export function NotesReminder({ topicId, topicName, className }: NotesReminderProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    // Check if user has dismissed this topic's reminder
    const dismissedTopics = getDismissedTopics()
    setIsVisible(!dismissedTopics.has(topicId))
  }, [topicId])

  const handleDismiss = () => {
    setIsVisible(false)
    addDismissedTopic(topicId)
  }

  if (!isMounted || !isVisible) {
    return null
  }

  return (
    <div className={cn(
      'sticky top-0 z-40 flex items-center gap-3 bg-blue-50 border-b border-blue-200 px-4 py-3 text-sm',
      className
    )}>
      <FileText className="h-5 w-5 text-blue-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-blue-900 font-medium">
          Don't forget: You haven't created notes for <strong>{topicName}</strong> yet.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link href="/tools/notes" passHref>
          <Button
            size="sm"
            variant="outline"
            className="text-blue-600 border-blue-300 hover:bg-blue-100"
          >
            Create Notes
          </Button>
        </Link>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-blue-100 rounded transition-colors text-blue-600"
          aria-label="Dismiss reminder"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// Helper functions for managing dismissed topics in localStorage
const STORAGE_KEY = 'cautie_dismissed_notes_reminders'

function getDismissedTopics(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return new Set(stored ? JSON.parse(stored) : [])
  } catch {
    return new Set()
  }
}

function addDismissedTopic(topicId: string): void {
  if (typeof window === 'undefined') return
  try {
    const dismissed = getDismissedTopics()
    dismissed.add(topicId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(dismissed)))
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function resetDismissedTopics(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Silently fail
  }
}
