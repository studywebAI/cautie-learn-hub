'use client'

import { useContext } from 'react'
import { AppContext } from '@/contexts/app-context'
import { TeacherQuizAnalytics } from '@/components/analytics/teacher-quiz-analytics'
import { PageSection } from '@/components/layout/page-section'

export default function TeacherAnalyticsPage() {
  const appContext = useContext(AppContext) as any
  const isTeacher = appContext?.role === 'teacher'

  if (!isTeacher) {
    return (
      <PageSection className="[--accent-brand:#6b7c4e]">
        <div className="text-center">
          <p className="text-muted-foreground">You need to be a teacher to access this page.</p>
        </div>
      </PageSection>
    )
  }

  return (
    <PageSection className="[--accent-brand:#6b7c4e]">
      <div className="mb-6">
        <h1 className="text-2xl text-foreground">Class Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Analyze your classes' quiz performance and identify areas for improvement.
        </p>
      </div>

      <TeacherQuizAnalytics />
    </PageSection>
  )
}
