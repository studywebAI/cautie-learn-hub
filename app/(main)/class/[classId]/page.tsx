'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useContext, useEffect, useState, useMemo } from 'react';
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
import { AuditLogsPanel } from '@/components/dashboard/teacher/audit-logs-panel';
import { SubjectOverview } from '@/components/dashboard/teacher/subject-overview';
import { StudentProgressPanel } from '@/components/dashboard/teacher/student-progress';
import { InviteTab } from '@/components/class/invite-tab';
import { GroupTab } from '@/components/class/group-tab';
import { GraduationCap } from 'lucide-react';

export default function ClassDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { classId } = params as { classId: string };
  const tab = searchParams.get('tab') || 'invite';
  const { classes, assignments, isLoading: isAppLoading, materials, refetchMaterials, role, students: allStudents } = useContext(AppContext) as AppContextType;

  const students = allStudents || [];
  const [directClassInfo, setDirectClassInfo] = useState<ClassInfo | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | undefined>(undefined);
  const [isQuickGraderOpen, setIsQuickGraderOpen] = useState(false);

  const classInfo: ClassInfo | undefined = useMemo(() => {
    const contextClass = classes.find(c => c.id === classId);
    if (contextClass) return contextClass;
    return directClassInfo || undefined;
  }, [classes, classId, directClassInfo]);
  
  const classAssignments = useMemo(() => assignments.filter(a => a.class_id === classId), [assignments, classId]);

  useEffect(() => {
    if (classId && !classId.startsWith('local-')) {
        refetchMaterials(classId);
    }
  }, [classId, refetchMaterials]);

  useEffect(() => {
    if (!classId || classId.startsWith('local-')) return;
    const contextClass = classes.find(c => c.id === classId);
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
        return <GroupTab classId={classId} isTeacher={isTeacher} />;
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
      case 'progress':
        return isTeacher ? <StudentProgressPanel classId={classId} /> : null;
      case 'subjects':
        return isTeacher ? <SubjectOverview classId={classId} /> : null;
      case 'analytics':
        return isTeacher ? <ClassAnalyticsDashboard classId={classId} /> : null;
      case 'attendance':
        return isTeacher ? <AttendancePanel classId={classId} /> : null;
      case 'settings':
        return isTeacher ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ClassSettings classId={classId} className={classInfo.name} isArchived={classInfo.status === 'archived'} onArchive={() => window.location.href = '/classes'} />
            <AuditLogsPanel classId={classId} />
          </div>
        ) : null;
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
        return <StudentList students={students} isLoading={!!isLoading} classInfo={classInfo as { id: string; name: string; join_code: string | null; teacher_join_code: string | null }} />;
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
