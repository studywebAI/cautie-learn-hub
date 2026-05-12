'use client';
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines";
import { useContext, lazy, Suspense, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppContext, AppContextType, ClassInfo } from "@/contexts/app-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { School, Users, FileText, Activity, ChevronRight, ClipboardList, BarChart2, Calendar, BookOpen, MessageSquare, UserCheck } from "lucide-react";
import { CautieLoader } from "@/components/ui/cautie-loader";
import { Alerts } from "@/components/dashboard/alerts";
import { MySubjects } from "@/components/dashboard/my-subjects";
import type { Alert, Subject } from '@/lib/types';
import { TodaysStudysetTasks } from "@/components/dashboard/todays-studyset-tasks";
import { LearningPulse } from "@/components/dashboard/learning-pulse";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { TodayPlanCard } from "@/components/dashboard/today-plan-card";
import { GradesMiniCard } from "@/components/dashboard/grades-mini-card";
import { RecentActivityFeed } from "@/components/dashboard/teacher/recent-activity-feed";
import { AnnouncementsStrip } from "@/components/dashboard/announcements-strip";

// Thin wrapper so we can reference it inside TeacherSummaryDashboard
function RecentActivityFeedSection() {
  return <RecentActivityFeed />;
}

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
    <div className="page-content grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        {/* Greeting header */}
        <div className="lg:col-span-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="page-title">{getGreeting()}, {welcomeName}</h1>
            <p className="page-subtitle mt-0.5">
              {getDayLabel()}
              {todayTaskCount > 0 && (
                <> · <span className="text-[var(--accent-brand)]">{todayTaskCount} {todayTaskCount === 1 ? 'task' : 'tasks'} due today</span></>
              )}
            </p>
          </div>
          <NotificationCenter />
        </div>

        {/* Main column */}
        <div className="lg:col-span-2 flex flex-col gap-4 md:gap-5">
            <AnnouncementsStrip />
            <TodayPlanCard
              assignments={assignments}
              personalTasks={personalTasks}
              classes={classes}
              schoolSlots={schoolSlots}
            />
            <TodaysStudysetTasks />
            <Suspense fallback={<Card><CardHeader><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-1/3" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>}>
              <AnalyticsDashboard />
            </Suspense>
            <MySubjects subjects={subjects} />
        </div>

        {/* Sidebar rail */}
        <div className="lg:col-span-1 flex flex-col gap-4 md:gap-5">
            <GradesMiniCard />
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
    const [unreadMessages, setUnreadMessages] = useState(0);

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

    // Fetch unread message count from notifications
    useEffect(() => {
      if (!session || isLikelyBotClient()) return;
      fetch('/api/dashboard/teacher/activity?limit=50&type=messages')
        .then(r => r.ok ? r.json() : { items: [] })
        .then(d => {
          const unread = (d?.items || []).filter((i: any) => !i.read).length;
          setUnreadMessages(unread);
        })
        .catch(() => {});
    }, [session]);

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
            {/* Greeting */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="page-title">{getGreeting()}, {welcomeName}</h1>
                <p className="page-subtitle mt-0.5">{getDayLabel()} · {teacherClasses.length} {teacherClasses.length === 1 ? 'class' : 'classes'}</p>
              </div>
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
              {/* Messages card */}
              {resolvedClassId ? (
                <Link href={`/class/${resolvedClassId}?tab=share`} className="rounded-xl surface-panel border border-border p-3.5 hover:bg-[hsl(var(--interactive-hover))] transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Messages</span>
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-semibold">{unreadMessages}</div>
                    {unreadMessages > 0 && <span className="text-[10px] font-semibold text-[var(--accent-brand)]">unread</span>}
                  </div>
                </Link>
              ) : (
                <div className="rounded-xl surface-panel border border-border p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Messages</span>
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-semibold">{unreadMessages}</div>
                </div>
              )}
            </div>

            {teacherClasses.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center">
                <p className="text-muted-foreground mb-4">You have not created any classes yet.</p>
                <Button asChild size="sm"><Link href="/classes">Create your first class</Link></Button>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Left: Recent activity + quick links */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <RecentActivityFeedSection />

                  {/* Quick links to active class */}
                  {resolvedClassId && (
                    <div className="rounded-xl surface-panel border border-border p-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Quick access</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { href: `/class/${resolvedClassId}?tab=group`, icon: Users, label: 'Class overview' },
                          { href: `/class/${resolvedClassId}?tab=grades`, icon: ClipboardList, label: 'Grades' },
                          { href: `/class/${resolvedClassId}?tab=group`, icon: UserCheck, label: 'Attendance' },
                          { href: `/class/${resolvedClassId}?tab=analytics`, icon: BarChart2, label: 'Analytics' },
                          { href: `/agenda?classId=${resolvedClassId}`, icon: Calendar, label: 'Agenda' },
                          { href: `/class/${resolvedClassId}?tab=share`, icon: MessageSquare, label: 'Chat' },
                        ].map(({ href, icon: Icon, label }) => (
                          <Link key={href} href={href} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[hsl(var(--interactive-hover))] transition-colors">
                            <Icon className="h-3.5 w-3.5 text-[var(--accent-brand)] shrink-0" />
                            <span className="truncate">{label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Classes list */}
                <div className="rounded-xl surface-panel border border-border p-4 h-fit">
                  <p className="text-xs font-medium text-muted-foreground mb-2.5">Your classes</p>
                  <div className="space-y-1">
                    {teacherClasses.slice(0, 8).map((cls) => (
                      <Link
                        key={cls.id}
                        href={`/class/${cls.id}?tab=group`}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-[hsl(var(--interactive-hover))] transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <School className="h-3.5 w-3.5 text-[var(--accent-brand)] shrink-0" />
                          <span className="truncate">{cls.name}</span>
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </Link>
                    ))}
                    {teacherClasses.length > 8 && (
                      <p className="text-xs text-muted-foreground px-3 pt-1">+{teacherClasses.length - 8} more</p>
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
