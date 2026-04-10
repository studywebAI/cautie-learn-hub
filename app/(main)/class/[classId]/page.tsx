'use client';

import dynamic from 'next/dynamic';
import { useParams, useSearchParams } from 'next/navigation';
import { useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { AppContext, AppContextType, ClassInfo } from '@/contexts/app-context';
import { Skeleton } from '@/components/ui/skeleton';
import { CautieLoader } from '@/components/ui/cautie-loader';
import type { Student } from '@/lib/teacher-types';
import { logClassTabEvent } from '@/lib/class-tab-telemetry';

const AssignmentList = dynamic(
  () => import('@/components/dashboard/teacher/assignment-list').then((m) => m.AssignmentList)
);
const StudentList = dynamic(
  () => import('@/components/dashboard/teacher/student-list').then((m) => m.StudentList)
);
const MaterialList = dynamic(
  () => import('@/components/dashboard/teacher/material-list').then((m) => m.MaterialList)
);
const QuickGrader = dynamic(
  () => import('@/components/dashboard/teacher/quick-grader').then((m) => m.QuickGrader),
  { ssr: false }
);
const SubjectOverview = dynamic(
  () => import('@/components/dashboard/teacher/subject-overview').then((m) => m.SubjectOverview)
);
const InviteTab = dynamic(
  () => import('@/components/class/invite-tab').then((m) => m.InviteTab)
);
const GroupTab = dynamic(
  () => import('@/components/class/group-tab').then((m) => m.GroupTab)
);

// Cache for tab data - persists across tab switches
const tabDataCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export default function ClassDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { classId } = params as { classId: string };
  const { classes, assignments, isLoading: isAppLoading, materials, refetchMaterials, role, students: allStudents } = useContext(AppContext) as AppContextType;
  const tab = searchParams.get('tab') || (role === 'teacher' ? 'subjects' : 'invite');

  const students = allStudents || [];
  const [directClassInfo, setDirectClassInfo] = useState<ClassInfo | null>(null);
  const [isQuickGraderOpen, setIsQuickGraderOpen] = useState(false);
  
  // Centralized tab data cache
  const [cachedTabData, setCachedTabData] = useState<Record<string, any>>({});
  const [loadingTabs, setLoadingTabs] = useState<Record<string, boolean>>({});
  const inFlightTabLoadsRef = useRef<Partial<Record<string, Promise<any>>>>({});

  const classInfo: ClassInfo | undefined = useMemo(() => {
    const contextClass = classes.find((c: any) => c.id === classId);
    if (contextClass) return contextClass;
    return directClassInfo || undefined;
  }, [classes, classId, directClassInfo]);
  
  const classAssignments = useMemo(() => assignments.filter((a: any) => a.class_id === classId), [assignments, classId]);

  useEffect(() => {
    if (classId && !classId.startsWith('local-')) {
        refetchMaterials(classId);
    }
  }, [classId, refetchMaterials]);

  useEffect(() => {
    if (!classId || classId.startsWith('local-')) return;
    const contextClass = classes.find((c: any) => c.id === classId);
    if (contextClass || directClassInfo) return;

    const fetchClassInfo = async () => {
      try {
        const response = await fetch(`/api/classes/${classId}`);
        if (response.ok) {
          const classData = await response.json();
          setDirectClassInfo(classData);
        }
      } catch (error) {
        console.error('Failed to fetch class info:', error);
      }
    };
    fetchClassInfo();
  }, [classId, classes, directClassInfo]);

  // Load and cache tab data - only fetches if not cached or cache expired
  const loadTabData = useCallback(async (tabName: string) => {
    const cacheKey = `${classId}-${tabName}`;
    const cached = tabDataCache[cacheKey];
    
    // Return cached data if valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      void logClassTabEvent({
        classId,
        tab: tabName,
        event: 'cache_hit',
        stage: 'load_tab_data',
        level: 'debug',
      });
      setCachedTabData((prev: any) => ({ ...prev, [tabName]: cached.data }));
      return cached.data;
    }

    // Don't refetch if already loading
    if (inFlightTabLoadsRef.current[cacheKey]) {
      void logClassTabEvent({
        classId,
        tab: tabName,
        event: 'inflight_reuse',
        stage: 'load_tab_data',
        level: 'debug',
      });
      return inFlightTabLoadsRef.current[cacheKey];
    }

    setLoadingTabs((prev: any) => ({ ...prev, [tabName]: true }));

    const run = (async () => {
      const startedAt = Date.now();
      try {
      let url = '';
      switch (tabName) {
        case 'group':
          url = `/api/classes/${classId}/group`;
          break;
        case 'subjects':
          url = `/api/classes/${classId}/subjects`;
          break;
        default:
          return null;
      }

      void logClassTabEvent({
        classId,
        tab: tabName,
        event: 'load_start',
        stage: 'load_tab_data',
        level: 'info',
        meta: { url },
      });

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        tabDataCache[cacheKey] = { data, timestamp: Date.now() };
        setCachedTabData((prev: any) => ({ ...prev, [tabName]: data }));
        void logClassTabEvent({
          classId,
          tab: tabName,
          event: 'load_success',
          stage: 'load_tab_data',
          level: 'info',
          meta: {
            duration_ms: Date.now() - startedAt,
          },
        });
        return data;
      }
      void logClassTabEvent({
        classId,
        tab: tabName,
        event: 'load_http_error',
        stage: 'load_tab_data',
        level: 'warn',
        meta: { status: response.status },
      });
      } catch (error) {
        console.error(`Failed to load ${tabName} data:`, error);
        void logClassTabEvent({
          classId,
          tab: tabName,
          event: 'load_exception',
          stage: 'load_tab_data',
          level: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setLoadingTabs((prev: any) => ({ ...prev, [tabName]: false }));
        delete inFlightTabLoadsRef.current[cacheKey];
      }
      return null;
    })();

    inFlightTabLoadsRef.current[cacheKey] = run;
    return run;
  }, [classId]);

  // Load only the active tab data first; keep other tabs lazy.
  useEffect(() => {
    if (classId && !isAppLoading) {
      void logClassTabEvent({
        classId,
        tab,
        event: 'tab_view',
        stage: 'navigation',
        level: 'info',
      });
      void loadTabData(tab);
    }
  }, [classId, isAppLoading, loadTabData, tab]);

  // Force refresh specific tab data
  const refreshTabData = useCallback((tabName: string) => {
    const cacheKey = `${classId}-${tabName}`;
    delete tabDataCache[cacheKey];
    void logClassTabEvent({
      classId,
      tab: tabName,
      event: 'refresh_requested',
      stage: 'manual',
      level: 'info',
    });
    return loadTabData(tabName);
  }, [classId, loadTabData]);

  const isLoading = !!isAppLoading;
  const isTeacher = role === 'teacher';

  if (isLoading && !classInfo) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <CautieLoader label="Loading class" sublabel="Fetching group and tab data" size="lg" />
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div>
        <h1 className="text-3xl font-bold font-headline">Class not found</h1>
        <p className="text-muted-foreground">The class you are looking for does not exist or you do not have permission to view it.</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (tab) {
      case 'invite':
        return (
          <InviteTab 
            classId={classId} 
            joinCode={(classInfo as any).join_code || 'N/A'} 
            teacherJoinCode={(classInfo as any).teacher_join_code}
          />
        );
      case 'group':
        return (
          <GroupTab
            classId={classId}
            isTeacher={isTeacher}
            cachedData={cachedTabData['group']}
            parentLoading={!!loadingTabs['group']}
          />
        );
      case 'assignments':
        return (
          <>
            {isTeacher && (
              <div className="mb-4">
                <button onClick={() => setIsQuickGraderOpen(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                  Quick Grade
                </button>
              </div>
            )}
            <AssignmentList assignments={classAssignments} classId={classId} isTeacher={isTeacher} />
          </>
        );
      case 'subjects':
        return isTeacher ? (
          <SubjectOverview 
            classId={classId} 
            cachedSubjects={cachedTabData['subjects']?.subjects}
          />
        ) : null;
      case 'materials':
        return <MaterialList materials={materials} classId={classId} isLoading={!!isLoading} isTeacher={isTeacher} />;
      case 'students':
        return <StudentList students={students} isLoading={!!isLoading} classInfo={classInfo as any} />;
      default:
        return (
          <InviteTab 
            classId={classId} 
            joinCode={(classInfo as any).join_code || 'N/A'} 
            teacherJoinCode={(classInfo as any).teacher_join_code}
          />
        );
    }
  };

  return (
    <>
      {isTeacher && (
        <QuickGrader classId={classId} isOpen={isQuickGraderOpen} onClose={() => setIsQuickGraderOpen(false)} />
      )}
      {renderContent()}
    </>
  );
}
