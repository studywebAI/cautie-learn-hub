'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { AppContext, AppContextType, ClassInfo } from '@/contexts/app-context';
import { Skeleton } from '@/components/ui/skeleton';
import { AssignmentList } from '@/components/dashboard/teacher/assignment-list';
import { StudentList } from '@/components/dashboard/teacher/student-list';
import type { Student } from '@/lib/teacher-types';
import { MaterialList } from '@/components/dashboard/teacher/material-list';
import { ClassSettings } from '@/components/dashboard/teacher/class-settings';
import { AnnouncementManager } from '@/components/dashboard/teacher/announcement-manager';
import { ClassAnalyticsDashboard } from '@/components/dashboard/teacher/class-analytics-dashboard';
import { ChapterNavigation } from '@/components/class/ChapterNavigation';
import { ChapterContentViewer } from '@/components/class/ChapterContentViewer';
import { ChapterEditor } from '@/components/class/ChapterEditor';
import { QuickGrader } from '@/components/dashboard/teacher/quick-grader';
import { AttendancePanel } from '@/components/dashboard/teacher/attendance-panel';
import { SubjectOverview } from '@/components/dashboard/teacher/subject-overview';
import { StudentProgressPanel } from '@/components/dashboard/teacher/student-progress';
import { InviteTab } from '@/components/class/invite-tab';
import { GroupTab } from '@/components/class/group-tab';
import { AttendanceTab } from '@/components/class/attendance-tab';
import { GradesTab } from '@/components/class/grades-tab';
import { LogsTab } from '@/components/class/logs-tab';
import { GraduationCap } from 'lucide-react';
import { logClassTabEvent } from '@/lib/class-tab-telemetry';

// Cache for tab data - persists across tab switches
const tabDataCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const TIER1_TABS = ['group', 'subjects'] as const;
const TIER2_TABS = ['announcements', 'progress', 'attendance', 'analytics'] as const;

export default function ClassDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { classId } = params as { classId: string };
  const { classes, assignments, isLoading: isAppLoading, materials, refetchMaterials, role, students: allStudents } = useContext(AppContext) as AppContextType;
  const tab = searchParams.get('tab') || (role === 'teacher' ? 'subjects' : 'invite');

  const students = allStudents || [];
  const [directClassInfo, setDirectClassInfo] = useState<ClassInfo | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | undefined>(undefined);
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
        case 'attendance':
          url = `/api/classes/${classId}/attendance`;
          break;
        case 'announcements':
          url = `/api/classes/${classId}/announcements`;
          break;
        case 'progress':
          url = `/api/classes/${classId}/progress`;
          break;
        case 'subjects':
          url = `/api/classes/${classId}/subjects`;
          break;
        case 'analytics':
          url = `/api/classes/${classId}/analytics`;
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

  // Tiered background warming to make first tab impressions feel instant.
  useEffect(() => {
    if (!classId || isAppLoading) return;

    const tier1Targets = TIER1_TABS.filter((tabName) => tabName !== tab);
    if (tier1Targets.length > 0) {
      const tier1StartedAt = Date.now();
      void Promise.all(tier1Targets.map((tabName) => loadTabData(tabName))).finally(() => {
        void logClassTabEvent({
          classId,
          tab,
          event: 'tier1_warm_complete',
          stage: 'preload',
          level: 'debug',
          meta: { targets: tier1Targets, duration_ms: Date.now() - tier1StartedAt },
        });
        console.log('[PRELOAD][TIER1] class workspace warm complete', {
          classId,
          activeTab: tab,
          targets: tier1Targets,
          durationMs: Date.now() - tier1StartedAt,
        });
      });
    }

    const runTier2 = () => {
      const tier2Targets = TIER2_TABS.filter((tabName) => tabName !== tab);
      if (tier2Targets.length > 0) {
        const tier2StartedAt = Date.now();
        void Promise.all(tier2Targets.map((tabName) => loadTabData(tabName))).finally(() => {
          void logClassTabEvent({
            classId,
            tab,
            event: 'tier2_warm_complete',
            stage: 'preload',
            level: 'debug',
            meta: { targets: tier2Targets, duration_ms: Date.now() - tier2StartedAt },
          });
          console.log('[PRELOAD][TIER2] class workspace warm complete', {
            classId,
            activeTab: tab,
            targets: tier2Targets,
            durationMs: Date.now() - tier2StartedAt,
          });
        });
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = (window as any).requestIdleCallback(runTier2, { timeout: 1200 });
      return () => {
        if ('cancelIdleCallback' in window) {
          (window as any).cancelIdleCallback(idleId);
        }
      };
    }

    const timer = globalThis.setTimeout(runTier2, 350);
    return () => globalThis.clearTimeout(timer);
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
      <div className="flex flex-col gap-8">
        <Skeleton className="h-96 w-full" />
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
        return <GroupTab classId={classId} isTeacher={isTeacher} cachedData={cachedTabData['group']} />;
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
      case 'announcements':
        return <AnnouncementManager classId={classId} isTeacher={isTeacher} />;
      case 'grades':
        return isTeacher ? <GradesTab classId={classId} /> : null;
      case 'progress':
        return isTeacher ? <StudentProgressPanel classId={classId} /> : null;
      case 'subjects':
        return isTeacher ? (
          <SubjectOverview 
            classId={classId} 
            cachedSubjects={cachedTabData['subjects']?.subjects}
          />
        ) : null;
      case 'analytics':
        return isTeacher ? <ClassAnalyticsDashboard classId={classId} /> : null;
      case 'attendance':
        return isTeacher ? <AttendanceTab classId={classId} /> : null;
      case 'settings':
        return isTeacher ? (
          <ClassSettings classId={classId} className={classInfo.name} isArchived={classInfo.status === 'archived'} onArchive={() => window.location.href = '/classes'} />
        ) : null;
      case 'logs':
        return isTeacher ? <LogsTab classId={classId} /> : null;
      case 'chapters':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <ChapterNavigation classId={classId} selectedChapterId={selectedChapterId} onChapterSelect={setSelectedChapterId} onCreateChapter={() => setSelectedChapterId('new')} isTeacher={isTeacher} />
            </div>
            <div className="lg:col-span-3">
              {isTeacher ? (
                <ChapterEditor classId={classId} chapterId={selectedChapterId || 'new'} onChapterUpdated={() => setSelectedChapterId(undefined)} />
              ) : selectedChapterId ? (
                <ChapterContentViewer classId={classId} chapterId={selectedChapterId} isTeacher={isTeacher} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <GraduationCap className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Select a chapter from the sidebar to view its content.</p>
                </div>
              )}
            </div>
          </div>
        );
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
