'use client';
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines";
import { useContext, lazy, Suspense, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppContext, AppContextType, ClassInfo } from "@/contexts/app-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { School, Users, FileText, Activity } from "lucide-react";
import { Alerts } from "@/components/dashboard/alerts";
import { MySubjects } from "@/components/dashboard/my-subjects";
import { parseISO, isFuture, differenceInDays } from 'date-fns';
import type { Alert, Subject } from '@/lib/types';
import { TodaysAgenda } from "@/components/dashboard/todays-agenda";
import { useRouter } from "next/navigation";

const AnalyticsDashboard = lazy(() => import("@/components/dashboard/analytics-dashboard").then(module => ({ default: module.AnalyticsDashboard })));

const checkScheduledAssignments = async () => {
  try {
    await fetch('/api/scheduler');
  } catch (error) {
    console.error('Error checking scheduled assignments:', error);
  }
};

function StudentDashboard() {
  const { isLoading, session, assignments, classes, personalTasks, subjects: dashboardSubjects } = useContext(AppContext) as AppContextType;

  useEffect(() => {
    checkScheduledAssignments();
  }, []);

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

  const email = session?.user?.email || '';
  const welcomeName = email ? email.split('@')[0] : 'guest';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-3 mb-2">
          <h1 className="text-xl tracking-tight text-foreground lowercase">welcome, {welcomeName}</h1>
        </div>
        <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
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

    useEffect(() => { checkScheduledAssignments(); }, []);

    if (isLoading || !classes) return <DashboardSkeleton />;

    const teacherClasses = (Array.isArray(classes) ? classes : []).filter(c => c.owner_id === session?.user?.id);
    const totalStudents = students?.length || 0;
    const activeAssignments = (Array.isArray(assignments) ? assignments : []).length;

    return (
        <div className="flex flex-col gap-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
                    <School className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{teacherClasses.length}</div>
                    <p className="text-xs text-muted-foreground">classes managed</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                     <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalStudents}</div>
                    <p className="text-xs text-muted-foreground">students across all classes</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
                     <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{activeAssignments}</div>
                    <p className="text-xs text-muted-foreground">upcoming assignments</p>
                </CardContent>
              </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                       <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">0</div>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
                <Card><CardHeader><Skeleton className="h-10 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
                 <Card><CardHeader><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-1/3" /></CardHeader><CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}</CardContent></Card>
            </div>
            <div className="flex flex-col gap-6 md:gap-8">
                <Card><CardHeader><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-1/3" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card>
                 <Card><CardHeader><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-1-3" /></CardHeader><CardContent className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></CardContent></Card>
            </div>
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
    if (!session || role !== 'teacher' || isLoading) return;

    const activeClasses = (Array.isArray(classes) ? classes : []).filter(
      (classItem) => classItem.status !== 'archived'
    );
    if (activeClasses.length === 0) return;

    const preferredClassId =
      (typeof window !== 'undefined' ? window.localStorage.getItem('studyweb-last-class-id') : null) ||
      activeClasses[0].id;

    const preferredClass = activeClasses.find((classItem) => classItem.id === preferredClassId) || activeClasses[0];
    if (!preferredClass?.id) return;

    router.replace(`/class/${preferredClass.id}?tab=subjects`);
  }, [session, role, isLoading, classes, router]);

  useEffect(() => {
    if (!session || role !== 'student' || isLoading) return;
    if (typeof window === 'undefined') return;

    const savedLane = window.localStorage.getItem('studyweb-student-lane');
    if (savedLane === 'tools') {
      const lastToolsRoute = window.localStorage.getItem('studyweb-last-tools-route') || '/tools';
      router.replace(lastToolsRoute);
      return;
    }

    const lastSchoolRoute = window.localStorage.getItem('studyweb-last-school-route') || '/classes';
    router.replace(lastSchoolRoute);
  }, [session, role, isLoading, router]);

  // Show skeleton ONLY if truly loading AND no cached data available
  if (isLoading && !hasCachedData) {
    return <DashboardSkeleton />;
  }

  if (!session) return <StudentDashboard />;

  if (role === 'student') {
    return <DashboardSkeleton />;
  }

  if (role === 'teacher' && (Array.isArray(classes) ? classes : []).some((classItem) => classItem.status !== 'archived')) {
    return <DashboardSkeleton />;
  }

  return <TeacherSummaryDashboard />;
}
