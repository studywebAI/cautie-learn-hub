'use client';
import { useContext, Suspense, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarCheck, ChevronRight } from "lucide-react";
import { AppContext, AppContextType } from "@/contexts/app-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CautieLoader } from '@/components/ui/cautie-loader';
import { MySubjects } from "@/components/dashboard/my-subjects";
import type { Subject } from '@/lib/types';
import { TodaysStudysetTasks } from "@/components/dashboard/todays-studyset-tasks";
import { ScheduledStudyItems } from "@/components/dashboard/scheduled-study-items";
import { NotificationPopover } from "@/components/notifications/notification-popover";
import { TodayPlanCard } from "@/components/dashboard/today-plan-card";
import { GradesMiniCard } from "@/components/dashboard/grades-mini-card";
import { RecentActivityFeed } from "@/components/dashboard/teacher/recent-activity-feed";
import { StudentStatRow } from "@/components/dashboard/student-stat-row";
import { TeacherMessageCard } from "@/components/dashboard/teacher-message-card";
import { TeacherMessageComposer } from "@/components/dashboard/teacher-message-composer";
import { DashboardCustomizeMenu, loadDashboardPrefs, DEFAULT_DASHBOARD_PREFS, type DashboardPrefs } from "@/components/dashboard/dashboard-customize-menu";
import { TeacherStatRow } from "@/components/dashboard/teacher-stat-row";
import { TeacherAgendaWidget } from "@/components/dashboard/teacher-agenda-widget";
import { TeacherToGradeCard } from "@/components/dashboard/teacher-to-grade-card";
import { TeacherLiveTestWidget } from "@/components/dashboard/teacher-live-test-widget";

// Thin wrapper so we can reference it inside TeacherSummaryDashboard
function RecentActivityFeedSection() {
  return (
    <Suspense fallback={
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3.5 w-3.5 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    }>
      <RecentActivityFeed />
    </Suspense>
  );
}

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

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDayLabel(): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
}

function StudentDashboard() {
  const { isLoading, session, assignments, classes, personalTasks, subjects: dashboardSubjects } = useContext(AppContext) as AppContextType;
  const [schoolSlots, setSchoolSlots] = useState<any[]>([]);
  const [displayName, setDisplayName] = useState<string>('');
  const [dashboardPrefs, setDashboardPrefs] = useState<DashboardPrefs>(DEFAULT_DASHBOARD_PREFS);

  useEffect(() => {
    setDashboardPrefs(loadDashboardPrefs('student'));
  }, []);

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

  const welcomeName =
    normalizeDisplayName(displayName) ||
    normalizeDisplayName((session as any)?.user?.user_metadata?.display_name) ||
    normalizeDisplayName((session as any)?.user?.user_metadata?.full_name) ||
    normalizeDisplayName((session as any)?.user?.email?.split('@')?.[0]) ||
    'Guest';

  // Count tasks due today for subtitle
  const todayTaskCount = (Array.isArray(assignments) ? assignments : [])
    .filter(a => {
      if (!a.due_date) return false;
      try { const d = new Date(a.due_date); const now = new Date(); return d.toDateString() === now.toDateString(); } catch { return false; }
    }).length +
    (Array.isArray(personalTasks) ? personalTasks : [])
    .filter(t => {
      if (!t.due_date) return false;
      try { const d = new Date(t.due_date); const now = new Date(); return d.toDateString() === now.toDateString(); } catch { return false; }
    }).length;

  return (
    <div className="page-content flex flex-col gap-5">
      {/* Greeting header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Welcome back, {welcomeName}</h1>
          <p className="page-subtitle mt-0.5">
            {getDayLabel()}
            {todayTaskCount > 0 && (
              <> · <span className="text-[var(--accent-brand)]">{todayTaskCount} {todayTaskCount === 1 ? 'task' : 'tasks'} due today</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <DashboardCustomizeMenu role="student" widgetKeys={['studyToday', 'scheduled', 'subjects']} onChange={setDashboardPrefs} />
          <NotificationPopover />
        </div>
      </div>

      {/* Stat row */}
      <StudentStatRow subjectsCount={subjects.length} />

      {/* Main content — single column, no duplicate nested sidebar */}
      <div className={`flex flex-col ${dashboardPrefs.density === 'compact' ? 'gap-2.5 md:gap-3' : 'gap-4 md:gap-5'}`}>
        <TeacherMessageCard />
        <TodayPlanCard
          assignments={assignments}
          personalTasks={personalTasks}
          classes={classes}
          schoolSlots={schoolSlots}
        />
        <GradesMiniCard />
        {dashboardPrefs.widgets.studyToday && <TodaysStudysetTasks />}
        {dashboardPrefs.widgets.scheduled && <ScheduledStudyItems />}
        {dashboardPrefs.widgets.subjects && <MySubjects subjects={subjects} />}
      </div>
    </div>
  );
}

function TeacherSummaryDashboard() {
    const { classes, assignments, isLoading, session, refetchClasses, refetchAssignments } = useContext(AppContext) as AppContextType;
    const [displayName, setDisplayName] = useState<string>('');
    const [teacherDashboardPrefs, setTeacherDashboardPrefs] = useState<DashboardPrefs>(DEFAULT_DASHBOARD_PREFS);

    useEffect(() => {
      setTeacherDashboardPrefs(loadDashboardPrefs('teacher'));
    }, []);

    useEffect(() => {
      if (typeof window === 'undefined') return;
      const saved = window.localStorage.getItem('studyweb-display-name') || '';
      const localName = normalizeDisplayName(saved);
      if (localName) { setDisplayName(localName); return; }
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
      const refresh = () => { void refetchClasses(); void refetchAssignments(); };
      window.addEventListener('focus', refresh);
      return () => window.removeEventListener('focus', refresh);
    }, [session, refetchClasses, refetchAssignments]);

    if (isLoading || !classes) return <DashboardSkeleton />;

    const teacherClasses = (Array.isArray(classes) ? classes : []).filter((c: any) => c?.status !== 'archived');
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
    const resolvedClass = teacherClasses.find(c => c.id === resolvedClassId);
    const teacherClassIds = teacherClasses.map(c => c.id);

    return (
        <div className="page-content flex flex-col gap-5">
            {/* Greeting */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="page-title">{getGreeting()}, {welcomeName}</h1>
                <p className="page-subtitle mt-0.5">
                  {getDayLabel()}
                  {resolvedClass && <> · Active class: <span className="text-foreground">{resolvedClass.name}</span></>}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <TeacherMessageComposer classId={resolvedClassId} />
                <DashboardCustomizeMenu
                  role="teacher"
                  widgetKeys={['agenda', 'liveTest']}
                  onChange={setTeacherDashboardPrefs}
                />
                <NotificationPopover />
              </div>
            </div>

            {/* Stat row */}
            <TeacherStatRow classIds={teacherClassIds} classesCount={teacherClasses.length} />

            {teacherClasses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center surface-panel">
                <p className="text-muted-foreground mb-4">You have not created any classes yet.</p>
                <Button asChild size="sm"><Link href="/classes">Create your first class</Link></Button>
              </div>
            ) : (
              <div className={`flex flex-col ${teacherDashboardPrefs.density === 'compact' ? 'gap-2.5 md:gap-3' : 'gap-4 md:gap-5'}`}>
                {teacherDashboardPrefs.widgets.liveTest && (
                  <TeacherLiveTestWidget classIds={teacherClassIds} />
                )}

                {teacherDashboardPrefs.widgets.agenda && (
                  <TeacherAgendaWidget assignments={assignments} classes={teacherClasses} />
                )}

                {/* Recent activity */}
                <RecentActivityFeedSection />

                <TeacherToGradeCard classIds={teacherClassIds} />

                <Link
                  href="/agenda"
                  className="group flex items-center gap-3 rounded-xl surface-panel border border-border p-4 shadow-sm transition-all hover:shadow-md hover:border-[var(--accent-brand)]/30"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-brand)]/10 text-[var(--accent-brand)] shrink-0">
                    <CalendarCheck className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">Manage Attendance</p>
                    <p className="text-xs text-muted-foreground">Track student attendance</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
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
