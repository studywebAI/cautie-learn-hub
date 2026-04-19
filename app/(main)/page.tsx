'use client';
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines";
import { useContext, lazy, Suspense, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppContext, AppContextType, ClassInfo } from "@/contexts/app-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { School, Users, FileText, Activity } from "lucide-react";
import { CautieLoader } from "@/components/ui/cautie-loader";
import { Alerts } from "@/components/dashboard/alerts";
import { MySubjects } from "@/components/dashboard/my-subjects";
import { parseISO, isFuture, differenceInDays } from 'date-fns';
import type { Alert, Subject } from '@/lib/types';
import { TodaysAgenda } from "@/components/dashboard/todays-agenda";
import { NextSchoolSlot } from "@/components/dashboard/next-school-slot";
import { TodaysStudysetTasks } from "@/components/dashboard/todays-studyset-tasks";
import { useRouter } from "next/navigation";

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
                <h3 className="text-2xl font-bold tracking-tight">Welcome to cautie</h3>
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-3 mb-2">
          <h1 className="text-xl tracking-tight text-foreground">Welcome, {welcomeName}</h1>
        </div>
        <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
            <NextSchoolSlot slots={schoolSlots} />
            <TodaysStudysetTasks />
            <TodaysAgenda assignments={assignments} personalTasks={personalTasks} classes={classes} />
            <Suspense fallback={<Card><CardHeader><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-1/3" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>}>
              <AnalyticsDashboard />
            </Suspense>
            <MySubjects subjects={subjects} />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6 md:gap-8">
            <Alerts alerts={alerts} />
            <UpcomingDeadlines />
        </div>
    </div>
  );
}

function TeacherSummaryDashboard() {
    const { classes, assignments, students, isLoading, session } = useContext(AppContext) as AppContextType;
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

    return (
        <div className="flex flex-col gap-8">
            <div>
              <h1 className="text-xl tracking-tight text-foreground">Welcome, {welcomeName}</h1>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm">Total Classes</CardTitle>
                    <School className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-xl">{teacherClasses.length}</div>
                    <p className="text-xs text-muted-foreground">classes managed</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm">Total Students</CardTitle>
                     <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-xl">{totalStudents}</div>
                    <p className="text-xs text-muted-foreground">students across all classes</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm">Active Assignments</CardTitle>
                     <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-xl">{activeAssignments}</div>
                    <p className="text-xs text-muted-foreground">upcoming assignments</p>
                </CardContent>
              </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm">Active Alerts</CardTitle>
                       <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-xl">0</div>
                      <p className="text-xs text-muted-foreground">students need attention</p>
                  </CardContent>
                </Card>
            </div>

            {teacherClasses.length === 0 && (
              <Card>
                <CardContent className="text-center p-8">
                  <p className="text-muted-foreground">You haven't created any classes yet.</p>
                  <Button asChild className="mt-4"><Link href="/classes">Create one now</Link></Button>
                </CardContent>
              </Card>
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
  const router = useRouter();
  
  // Check for cached data directly to avoid skeleton flash
  const cached = typeof window !== 'undefined' 
    ? JSON.parse(window.localStorage.getItem('studyweb-cached-dashboard') || 'null')
    : null;
  const hasCachedData = cached && cached.classes && cached.classes.length > 0;

  useEffect(() => {
    if (!session || role !== 'student' || isLoading) return;
    if (typeof window === 'undefined') return;

    const savedLane = window.localStorage.getItem('studyweb-student-lane');
    if (savedLane === 'tools') {
      const lastToolsRoute = window.localStorage.getItem('studyweb-last-tools-route') || '/tools';
      const current = `${window.location.pathname}${window.location.search}`;
      if (current === lastToolsRoute) return;
      router.replace(lastToolsRoute);
      return;
    }

    const lastSchoolRoute = window.localStorage.getItem('studyweb-last-school-route') || '/classes';
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === lastSchoolRoute) return;
    router.replace(lastSchoolRoute);
  }, [session, role, isLoading, router]);

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
