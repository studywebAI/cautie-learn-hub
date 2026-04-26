'use client';

import dynamic from 'next/dynamic';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { AppContext, AppContextType, ClassInfo } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { logClassTabEvent } from '@/lib/class-tab-telemetry';
import { STUDENT_CLASS_TAB_IDS, TEACHER_CLASS_TAB_IDS } from '@/lib/class-tabs';

const QuickGrader = dynamic(
  () => import('@/components/dashboard/teacher/quick-grader').then((m) => m.QuickGrader),
  { ssr: false }
);
const InviteTab = dynamic(
  () => import('@/components/class/invite-tab').then((m) => m.InviteTab)
);
const GroupTab = dynamic(
  () => import('@/components/class/group-tab').then((m) => m.GroupTab)
);
const AttendanceTab = dynamic(
  () => import('@/components/class/attendance-tab').then((m) => m.AttendanceTab)
);
const ScheduleTab = dynamic(
  () => import('@/components/class/schedule-tab').then((m) => m.ScheduleTab)
);
const GradesTab = dynamic(
  () => import('@/components/class/grades-tab').then((m) => m.GradesTab)
);
const LogsTab = dynamic(
  () => import('@/components/class/logs-tab').then((m) => m.LogsTab)
);
const ClassAnalyticsDashboard = dynamic(
  () => import('@/components/dashboard/teacher/class-analytics-dashboard').then((m) => m.ClassAnalyticsDashboard)
);
const ClassSettings = dynamic(
  () => import('@/components/dashboard/teacher/class-settings').then((m) => m.ClassSettings)
);

// Cache for tab data - persists across tab switches
const tabDataCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export default function ClassDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { classId } = params as { classId: string };
  const { classes, isLoading: isAppLoading, refetchMaterials, role, session } = useContext(AppContext) as AppContextType;
  const [directClassInfo, setDirectClassInfo] = useState<ClassInfo | null>(null);
  const [isResolvingClass, setIsResolvingClass] = useState(false);
  const [isQuickGraderOpen, setIsQuickGraderOpen] = useState(false);
  
  // Centralized tab data cache
  const [cachedTabData, setCachedTabData] = useState<Record<string, any>>({});
  const [loadingTabs, setLoadingTabs] = useState<Record<string, boolean>>({});
  const inFlightTabLoadsRef = useRef<Partial<Record<string, Promise<any>>>>({});

  useEffect(() => {
    setDirectClassInfo(null);
    // Prevent showing stale tab payload from a previously viewed class.
    setCachedTabData({});
    setLoadingTabs({});
    inFlightTabLoadsRef.current = {};
  }, [classId]);

  const classInfo: ClassInfo | undefined = useMemo(() => {
    const contextClass = classes.find((c: any) => c.id === classId);
    if (contextClass) return contextClass;
    return directClassInfo || undefined;
  }, [classes, classId, directClassInfo]);

  const teacherTabs = TEACHER_CLASS_TAB_IDS;
  const studentTabs = STUDENT_CLASS_TAB_IDS;

  const requestedTab = (searchParams.get('tab') || '').trim().toLowerCase();
  const normalizedRole = String(role || '').toLowerCase();
  const isTeacherRole = ['teacher', 'owner', 'admin', 'creator'].includes(normalizedRole);
  const requestsTeacherTab = teacherTabs.includes(requestedTab as any);
  const isClassOwner = useMemo(() => {
    if (!session?.user?.id) return false;
    const ownerCandidates = [String((classInfo as any)?.owner_id || ''), String((classInfo as any)?.user_id || '')];
    return ownerCandidates.includes(session.user.id);
  }, [classInfo, session?.user?.id]);
  const hasTeacherAccess = isTeacherRole || isClassOwner || (isAppLoading && requestsTeacherTab);
  const defaultTab = hasTeacherAccess ? 'group' : 'invite';
  const allowedTabs = useMemo(
    () => (
      hasTeacherAccess
        ? teacherTabs
        : studentTabs
    ),
    [hasTeacherAccess]
  );
  const tab = requestedTab && allowedTabs.includes(requestedTab as any) ? requestedTab : defaultTab;
  
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
      setIsResolvingClass(true);
      try {
        const response = await fetch(`/api/classes/${classId}`);
        if (response.ok) {
          const payload = await response.json();
          setDirectClassInfo((payload?.class || payload) as ClassInfo);
        }
      } catch (error) {
        console.error('Failed to fetch class info:', error);
      } finally {
        setIsResolvingClass(false);
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
      // Keep UI instant with cache, but always refresh in background for accuracy.
      setTimeout(() => {
        delete tabDataCache[cacheKey];
        void loadTabData(tabName);
      }, 0);
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
        case 'attendance':
          url = `/api/classes/${classId}/attendance`;
          break;
        case 'schedule':
          url = `/api/classes/${classId}/school-schedule`;
          break;
        case 'analytics':
          url = `/api/classes/${classId}/analytics`;
          break;
        case 'grades':
          url = `/api/classes/${classId}/grades`;
          break;
        case 'logs':
          url = `/api/classes/${classId}/audit-logs?limit=100&offset=0`;
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

  // Warm teacher-critical tabs in the background so switching feels instant.
  useEffect(() => {
    if (!classId || isAppLoading || !hasTeacherAccess) return;
    const warmTabs = async () => {
      await Promise.allSettled([
        loadTabData('group'),
        loadTabData('schedule'),
        loadTabData('attendance'),
        loadTabData('analytics'),
        loadTabData('grades'),
        loadTabData('logs'),
      ]);
    };
    void warmTabs();
  }, [classId, isAppLoading, hasTeacherAccess, loadTabData]);

  useEffect(() => {
    if (!requestedTab) return;
    if (isAppLoading) return;
    if ((allowedTabs as readonly string[]).includes(requestedTab)) return;
    router.replace(`/class/${classId}?tab=${tab}`);
  }, [requestedTab, allowedTabs, router, classId, tab, isAppLoading]);

  const isLoading = !!isAppLoading;
  const isTeacher = hasTeacherAccess;

  if (isLoading && !classInfo) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <CautieLoader label="Loading class" sublabel="Fetching group and tab data" size="lg" />
      </div>
    );
  }

  if (!classInfo) {
    if (isResolvingClass) {
      return (
        <div className="flex min-h-[55vh] items-center justify-center">
          <CautieLoader label="Loading class" sublabel="Resolving class access" size="lg" />
        </div>
      );
    }
    return (
      <div>
        <h1 className="text-xl">Class not found</h1>
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
      case 'attendance':
        return isTeacher ? (
          <AttendanceTab
            classId={classId}
            cachedData={cachedTabData['attendance']}
            parentLoading={!!loadingTabs['attendance']}
          />
        ) : <InviteTab classId={classId} joinCode={(classInfo as any).join_code || 'N/A'} teacherJoinCode={(classInfo as any).teacher_join_code} />;
      case 'schedule':
        return isTeacher ? (
          <ScheduleTab
            classId={classId}
            cachedData={cachedTabData['schedule']}
            parentLoading={!!loadingTabs['schedule']}
          />
        ) : <InviteTab classId={classId} joinCode={(classInfo as any).join_code || 'N/A'} teacherJoinCode={(classInfo as any).teacher_join_code} />;
      case 'grades':
        return isTeacher ? <GradesTab classId={classId} /> : <InviteTab classId={classId} joinCode={(classInfo as any).join_code || 'N/A'} teacherJoinCode={(classInfo as any).teacher_join_code} />;
      case 'analytics':
        return isTeacher ? <ClassAnalyticsDashboard classId={classId} /> : <InviteTab classId={classId} joinCode={(classInfo as any).join_code || 'N/A'} teacherJoinCode={(classInfo as any).teacher_join_code} />;
      case 'logs':
        return isTeacher ? <LogsTab classId={classId} cachedData={cachedTabData['logs']} parentLoading={!!loadingTabs['logs']} /> : <InviteTab classId={classId} joinCode={(classInfo as any).join_code || 'N/A'} teacherJoinCode={(classInfo as any).teacher_join_code} />;
      case 'settings':
        return isTeacher ? (
          <ClassSettings
            classId={classId}
            className={(classInfo as any)?.name || 'Class'}
            isArchived={Boolean((classInfo as any)?.isArchived || (classInfo as any)?.is_archived)}
          />
        ) : <InviteTab classId={classId} joinCode={(classInfo as any).join_code || 'N/A'} teacherJoinCode={(classInfo as any).teacher_join_code} />;
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
      <div key={`class-${classId}-tab-${tab}`}>{renderContent()}</div>
    </>
  );
}
