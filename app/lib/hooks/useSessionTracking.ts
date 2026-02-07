'use client'

import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook that automatically tracks study sessions.
 * Starts a session when the component mounts, ends it on unmount or page leave.
 */
export function useSessionTracking(paragraphId: string | null, isStudent: boolean) {
  const sessionIdRef = useRef<string | null>(null)
  const isTrackingRef = useRef(false)

  const startSession = useCallback(async () => {
    if (!paragraphId || !isStudent || isTrackingRef.current) return

    try {
      isTrackingRef.current = true
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paragraph_id: paragraphId,
          started_at: new Date().toISOString()
        })
      })

      if (response.ok) {
        const session = await response.json()
        sessionIdRef.current = session.id
        console.log('Session started:', session.id)
      } else {
        console.error('Failed to start session:', response.status)
        isTrackingRef.current = false
      }
    } catch (error) {
      console.error('Error starting session:', error)
      isTrackingRef.current = false
    }
  }, [paragraphId, isStudent])

  const endSession = useCallback(async () => {
    if (!sessionIdRef.current) return

    const sessionId = sessionIdRef.current
    sessionIdRef.current = null
    isTrackingRef.current = false

    try {
      // Use sendBeacon for reliability on page unload, fallback to fetch
      const body = JSON.stringify({
        session_id: sessionId,
        finished_at: new Date().toISOString()
      })

      // Try fetch first (more reliable response handling)
      const response = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true // Important for page unload
      })

      if (response.ok) {
        console.log('Session ended:', sessionId)
      }
    } catch (error) {
      console.error('Error ending session:', error)
    }
  }, [])

  useEffect(() => {
    if (!paragraphId || !isStudent) return

    startSession()

    // Handle page visibility change (tab switch, minimize)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        endSession()
      } else {
        startSession()
      }
    }

    // Handle page unload (close tab, navigate away)
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        // Use sendBeacon for reliable delivery on unload
        const body = JSON.stringify({
          session_id: sessionIdRef.current,
          finished_at: new Date().toISOString()
        })
        navigator.sendBeacon('/api/sessions', body)
        sessionIdRef.current = null
        isTrackingRef.current = false
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      endSession()
    }
  }, [paragraphId, isStudent, startSession, endSession])

  return { sessionId: sessionIdRef.current, endSession }
}
