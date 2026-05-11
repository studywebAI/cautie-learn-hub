'use client';
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines";
import { useContext, lazy, Suspense, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppContext, AppContextType, ClassInfo } from "@/contexts/app-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { School, Users, FileText, Activity, ChevronRight, ClipboardList, BarChart2, Calendar, BookOpen } from "lucide-react";
import { CautieLoader } from "@/components/ui/cautie-loader";
import { Alerts } from "@/components/dashboard/alerts";
import { MySubjects } from "@/components/dashboard/my-subjects";
import { parseISO, isFuture, differenceInDays } from 'date-fns';
import type { Alert, Subject } from '@/lib/types';
import { TodaysAgenda } from "@/components/dashboard/todays-agenda";
import { TodaysStudysetTasks } from "@/components/dashboard/todays-studyset-tasks";
import { LearningPulse } from "@/components/dashboard/learning-pulse";
import { NotificationCenter } from "@/components/notifications/notification-center";

const AnalyticsDashboard = lazy(() => import("@/components/dashboard/analytics-dashboard").then(module => ({ default: module.AnalyticsDashboard })));
const BOT_UA_PATTERN = /(HeadlessChrome|vercel-screenshot|vercel-favicon|bot|crawler|spider)/i;

function normalizeDisplayName(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  if (!normalized) return '';
  if (normalized.toLowerCase() === 'guest') return '';
  if (!/[\p{L}\p{N}]/u.test(normalized)) return '';
  return normalized;
}

function isLikelyBotClient(): boolean {
  if (typeof window === 'undefined') return false;
  return BOT_UA_PATTERN.test(window.navigator.userAgent || '');
}

function StudentDashboard() {
  const { isLoading, session, assignments, classes, personalTasks, subjects: dashboardSubjects } = useContext(AppContext) as AppContextType;
  const [schoolSlots, setSchoolSlots] = useState<any[]>([]);
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    if (isLikelyBotClient()) return;
    if (!session) return;
    const loadSchoolSchedule = async () => {
      try {
        const response = await fetch('/api/school-schedule');
        if (!response.ok) return;
        const data = await response.json();
        setSchoolSlots(data.slots || []);
      } catch {
        setSchoolSlots([]);
      }
    };
    void loadSchoolSchedule();
  }, [session]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('studyweb-display-name') || '';
    const localName = normalizeDisplayName(saved);
    if (localName) {
      setDisplayName(localName);
      return;
    }
    const metaName = normalizeDisplayName(
      (session as any)?.user?.user_metadata?.display_name ||
      (session as any)?.user?.user_metadata?.full_name ||
      (session as any)?.user?.user_metadata?.name
    );
    if (metaName) setDisplayName(metaName);
  }, [session]);

  if (isLoading && !session) {
     return (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <div className="flex flex-col items-center gap-2">
                <h3 className="page-title">Welcome to cautie</h3>
                <p className="text-sm text-muted-foreground">Log in to save your progress and access your classes.</p>
                <Button asChild className="mt-4"><Link href="/login">Log In / Sign Up</Link></Button>
            </div>
        </div>
    )
  }

  if (isLoading || !assignments || !classes || !personalTasks) {
    return <DashboardSkeleton />;
  }

  const subjects: Subject[] = (dashboardSubjects || []).map(s => ({
    id: s.id, name: s.title, title: s.title, progress: 0, classes: s.classes,
    cover_image_url: s.cover_image_url, description: s.description,
  }));

  const alerts: Alert[] = [];

  const welcomeName =
    normalizeDisplayName(displayName) ||
    normalizeDisplayName((session as any)?.user?.user_metadata?.display_name) ||
    normalizeDisplayName((session as any)?.user?.user_metadata?.full_name) ||
    normalizeDisplayName((session as any)?.user?.email?.split('@')?.[0]) ||
    'Guest';

  return (
    <div className="page-content grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-3 mb-2 flex items-start justify-between gap-3">
          <h1 className="page-title">Welcome, {welcomeName}</h1>
          <NotificationCenter />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-4 md:gap-6">
            <TodaysStudysetTasks />
            <TodaysAgenda assignments={assignments} personalTasks={personalTasks} classes={classes} />
            <Suspense fallback={<Card><CardHeader><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-1/3" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>}>
              <AnalyticsDashboard />
            </Suspense>
            <MySubjects subjects={subjects} />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-4 md:gap-6">
            <LearningPulse />
            <Alerts alerts={alerts} />
            <UpcomingDeadlines />
        </div>
    </div>
  );
}

function TeacherSummaryDashboard() {
    const { classes, assignments, students, isLoading, session, refetchClasses, refetchAssignments } = useContext(AppContext) as AppContextType;
    const [displayName, setDisplayName] = useState<string>('');

    useEffect(() => {
      if (typeof window === 'undefined') return;
      const saved = window.localStorage.getItem('studyweb-display-name') || '';
      const localName = normalizeDisplayName(saved);
      if (localName) {
        setDisplayName(localName);
        return;
      }
      const metaName = normalizeDisplayName(
        (session as any)?.user?.user_metadata?.display_name ||
        (session as any)?.user?.user_metadata?.full_name ||
        (session as any)?.user?.user_metadata?.name
      );
      if (metaName) setDisplayName(metaName);
    }, [session]);

    useEffect(() => {
      if (!session) return;
      void refetchClasses();
      void refetchAssignments();

      const refresh = () => {
        void refetchClasses();
        void refetchAssignments();
      };
      window.addEventListener('focus', refresh);
      return () => window.removeEventListener('focus', refresh);
    }, [session, refetchClasses, refetchAssignments]);

    if (isLoading || !classes) return <DashboardSkeleton />;

    const teacherClasses = (Array.isArray(classes) ? classes : []).filter((c: any) => c?.status !== 'archived');
    const totalStudents = students?.length || 0;
    const activeAssignments = (Array.isArray(assignments) ? assignments : []).length;
    const welcomeName =
      normalizeDisplayName(displayName) ||
      normalizeDisplayName((session as any)?.user?.user_metadata?.display_name) ||
      normalizeDisplayName((session as any)?.user?.user_metadata?.full_name) ||
      normalizeDisplayName(session?.user?.email ? session.user.email.split('@')[0] : '') ||
      'Guest';

    const activeClass = teacherClasses[0];
    const activeClassId = typeof window !== 'undefined'
      ? (window.localStorage.getItem('studyweb-last-class-id') || activeClass?.id || '')
      : (activeClass?.id || '');
    const resolvedClassId = teacherClasses.find(c => c.id === activeClassId)?.id || activeClass?.id || '';

    return (
        <div className="page-content flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <h1 className="page-title">Welcome, {welcomeName}</h1>
              <NotificationCenter />
            </div>

            {/* Stat row */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <div className="rounded-xl surface-panel border border-border p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Classes</span>
                  <School className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="text-2xl font-semibold">{teacherClasses.length}</div>
              </div>
              <div className="rounded-xl surface-panel border border-border p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Students</span>
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="text-2xl font-semibold">{totalStudents}</div>
              </div>
              <div className="rounded-xl surface-panel border border-border p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Assignments</span>
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="text-2xl font-semibold">{activeAssignments}</div>
              </div>
              <div className="rounded-xl surface-panel border border-border p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Alerts</span>
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="text-2xl font-semibold">0</div>
              </div>
            </div>

            {teacherClasses.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center">
                <p className="text-muted-foreground mb-4">You have not created any classes yet.</p>
                <Button asChild size="sm"><Link href="/classes">Create your first class</Link></Button>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Quick actions */}
                <div className="rounded-xl surface-panel border border-border p-4 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2.5">Quick actions</p>
                  {resolvedClassId && (
                    <>
                      <Link href={`/class/${resolvedClassId}?tab=group`} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:surface-interactive transition-colors">
                        <span className="flex items-center gap-2"><Users className="h-4 w-4 text-[var(--accent-brand)]" /> Class overview</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                      <Link href={`/class/${resolvedClassId}?tab=grades`} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:surface-interactive transition-colors">
                        <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-[var(--accent-brand)]" /> Grades</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                      <Link href={`/class/${resolvedClassId}?tab=analytics`} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:surface-interactive transition-colors">
                        <span className="flex items-center gap-2"><BarChart2 className="h-4 w-4 text-[var(--accent-brand)]" /> Analytics</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                      <Link href={`/agenda?classId=${resolvedClassId}`} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:surface-interactive transition-colors">
                        <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-[var(--accent-brand)]" /> Agenda</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                      <Link href={`/subjects?classId=${resolvedClassId}`} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:surface-interactive transition-colors">
                        <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-[var(--accent-brand)]" /> Subjects</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                    </>
                  )}
                </div>

                {/* Classes list */}
                <div className="lg:col-span-2 rounded-xl surface-panel border border-border p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2.5">Your classes</p>
                  <div className="space-y-1.5">
                    {teacherClasses.slice(0, 6).map((cls) => (
                      <Link
                        key={cls.id}
                        href={`/class/${cls.id}?tab=group`}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:surface-interactive transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <School className="h-4 w-4 text-[var(--accent-brand)] shrink-0" />
                          <span className="truncate">{cls.name}</span>
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </Link>
                    ))}
                    {teacherClasses.length > 6 && (
                      <p className="text-xs text-muted-foreground px-3 pt-1">+{teacherClasses.length - 6} more classes</p>
                    )}
                  </div>
                </div>
              </div>
            )}
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="flex min-h-[55vh] items-center justify-center">
            <CautieLoader label="Loading dashboard" sublabel="Gathering class overview" size="lg" />
        </div>
    )
}

export default function DashboardPage() {
  const { role, isLoading, session, classes } = useContext(AppContext) as AppContextType;
  
  // Check for cached data directly to avoid skeleton flash
  const cached = typeof window !== 'undefined' 
    ? JSON.parse(window.localStorage.getItem('studyweb-cached-dashboard') || 'null')
    : null;
  const hasCachedData = cached && cached.classes && cached.classes.length > 0;

  // Note: no redirect — students see the full dashboard at /

  // Show skeleton ONLY if truly loading AND no cached data available
  if (isLoading && !hasCachedData) {
    return <DashboardSkeleton />;
  }

  if (!session) return <StudentDashboard />;

  if (role === 'student') {
    return <StudentDashboard />;
  }

  if (role === 'teacher') return <TeacherSummaryDashboard />;

  return <StudentDashboard />;
}
