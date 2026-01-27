'use client';
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines";
import { useContext, lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppContext, AppContextType, ClassInfo } from "@/contexts/app-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, School, Users, FileText, Activity } from "lucide-react";
import { ClassCard } from "@/components/dashboard/teacher/class-card";
import { Alerts } from "@/components/dashboard/alerts";
import { MySubjects } from "@/components/dashboard/my-subjects";
import { parseISO, isFuture, differenceInDays } from 'date-fns';
import type { Alert, Subject } from '@/lib/types';
import { TodaysAgenda } from "@/components/dashboard/todays-agenda";
// Lazy load heavy components
const AnalyticsDashboard = lazy(() => import("@/components/dashboard/analytics-dashboard").then(module => ({ default: module.AnalyticsDashboard })));

function StudentDashboard() {
  const { isLoading, session, assignments, classes, personalTasks } = useContext(AppContext) as AppContextType;

  if (isLoading && !session) {
     return (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-12 text-center">
            <div className="flex flex-col items-center gap-2">
                <h3 className="text-2xl font-bold tracking-tight">
                Welcome to cautie
                </h3>
                <p className="text-sm text-muted-foreground">
                Log in to save your progress and access your classes.
                </p>
                <Button asChild className="mt-4">
                    <Link href="/login">Log In / Sign Up</Link>
                </Button>
            </div>
        </div>
    )
  }

  if (isLoading || !assignments || !classes || !personalTasks) {
    return <DashboardSkeleton />;
  }

  const enrolledClasses = (Array.isArray(classes) ? classes : []).filter(c => c.owner_id !== session?.user?.id);
  const subjects: Subject[] = enrolledClasses.map(c => ({
    id: c.id,
    name: c.name,
    progress: 0 // Placeholder until progress is tracked
  }));

  const alerts: Alert[] = []; // Simplified - no due dates in current schema

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Welcome to your Dashboard</CardTitle>
                    <CardDescription>Here's what's on your agenda for today. Navigate to the full Agenda to manage all your tasks.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TodaysAgenda assignments={assignments} personalTasks={personalTasks} classes={classes} />
                </CardContent>
            </Card>
            <Suspense fallback={
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-40 w-full" />
                </CardContent>
              </Card>
            }>
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

    if (isLoading || !classes) {
        return <DashboardSkeleton />;
    }

    // For teacher dashboard, we only care about classes they own.
    const teacherClasses = (Array.isArray(classes) ? classes : []).filter(c => c.owner_id === session?.user.id);

    const totalStudents = students.length;

    const activeAssignments = (Array.isArray(assignments) ? assignments : []).length;

    const lowProgressAlerts = 0; // Placeholder until progress is tracked

    return (
        <div className="flex flex-col gap-8">
            <header>
                <h1 className="text-3xl font-bold font-headline">Welcome Back, Teacher</h1>
                <p className="text-muted-foreground">
                    Here's a high-level summary of your classes.
                </p>
            </header>
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
                        <div className="text-2xl font-bold">{lowProgressAlerts}</div>
                        <p className="text-xs text-muted-foreground">students need attention</p>
                    </CardContent>
                </Card>
            </div>

             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="font-headline">Your Classes</CardTitle>
                            <CardDescription>A quick look at your most recent classes.</CardDescription>
                        </div>
                        <Button asChild variant="outline">
                            <Link href="/classes">
                                Manage All Classes
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teacherClasses.slice(0, 2).map(classInfo => (
                         <ClassCard key={classInfo.id} classInfo={classInfo} isArchived={false} />
                    ))}
                     {teacherClasses.length === 0 && (
                        <p className="text-muted-foreground col-span-2 text-center p-8">You haven't created any classes yet. <Link href="/classes" className="text-primary hover:underline">Create one now</Link> to get started.</p>
                    )}
                </CardContent>
             </Card>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                    </CardHeader>
                     <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}
                    </CardContent>
                </Card>
            </div>
            <div className="flex flex-col gap-6 md:gap-8">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-1-3" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function DashboardPage() {
  const { role, isLoading, session } = useContext(AppContext) as AppContextType;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // When not logged in, always show the student/guest view.
  if (!session) {
    return <StudentDashboard />;
  }

  return (
      role === 'student' ? <StudentDashboard /> : <TeacherSummaryDashboard />
  );
}



