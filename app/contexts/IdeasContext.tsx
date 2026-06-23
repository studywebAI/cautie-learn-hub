'use client'

import { createContext, useContext, ReactNode } from 'react'

interface Idea {
  id: string
  title: string
  description: string | null
  status: 'active' | 'pending' | 'completed'
  vote_count: number
  created_at: string
}

interface IdeasContextType {
  ideas: Idea[]
}

const IdeasContext = createContext<IdeasContextType | undefined>(undefined)

export function IdeasProvider({ children, ideas }: { children: ReactNode; ideas: Idea[] }) {
  return <IdeasContext.Provider value={{ ideas }}>{children}</IdeasContext.Provider>
}

export function useIdeas() {
  const context = useContext(IdeasContext)
  if (!context) {
    throw new Error('useIdeas must be used within IdeasProvider')
  }
  return context.ideas
}
