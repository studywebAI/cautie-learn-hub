'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Target, BarChart3, ChevronRight, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Loader from '@/components/ui/loader';
import { PageSection } from '@/components/layout/page-section';
import { AppContext } from '@/contexts/app-context';
import { StudentQuizAnalytics } from '@/components/analytics/student-quiz-analytics';
import { TeacherQuizAnalytics } from '@/components/analytics/teacher-quiz-analytics';
import { PageHeader } from '@/components/page-header';

function TeacherAnalytics() {
  return (
    <PageSection>
      <PageHeader title="Analytics" subtitle="Track your classes' performance and identify areas for improvement." />

      {/* Teacher Quiz Analytics Section */}
      <div className="mb-8">
        <TeacherQuizAnalytics />
      </div>
    </PageSection>
  );
}

export default function AnalyticsOverviewPage() {
  const appContext = useContext(AppContext) as any;
  const isTeacher = appContext?.role === 'teacher';

  if (isTeacher) return <TeacherAnalytics />;

  return <StudentAnalytics />;
}

function StudentAnalytics() {
  return (
    <PageSection>
      <PageHeader title="Analytics" subtitle="Track your performance and progress across quizzes and topics." />

      {/* Quiz Analytics Section */}
      <div className="mb-8">
        <StudentQuizAnalytics />
      </div>
    </PageSection>
  );
}
