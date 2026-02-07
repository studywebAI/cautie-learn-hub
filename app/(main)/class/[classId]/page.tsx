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

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Users, FileText, Settings, GraduationCap, Bell, BarChart3, Library } from 'lucide-react';


export default function ClassDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { classId } = params as { classId: string };
  const { classes, assignments, isLoading: isAppLoading, materials, refetchMaterials, role, students: allStudents } = useContext(AppContext) as AppContextType;

  // Use students from app context instead of individual fetching
  const students = allStudents || [];

  const [directClassInfo, setDirectClassInfo] = useState<ClassInfo | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | undefined>(undefined);

  const classInfo: ClassInfo | undefined = useMemo(() => {
    // First try to find in context
    const contextClass = classes.find(c => c.id === classId);
    if (contextClass) return contextClass;

    // If not found in context, use directly fetched class
    return directClassInfo || undefined;
  }, [classes, classId, directClassInfo]);
  const classAssignments = useMemo(() => assignments.filter(a => a.class_id === classId), [assignments, classId]);


  useEffect(() => {
    if (classId && !classId.startsWith('local-')) {
        refetchMaterials(classId);
    }
  }, [classId, refetchMaterials]);

  // Fetch class info directly if not found in context (for archived classes)
  useEffect(() => {
    if (!classId || classId.startsWith('local-')) return;

    const contextClass = classes.find(c => c.id === classId);
    if (contextClass || directClassInfo) return; // Already have the class info

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

  // Check if user is a teacher (global role)
  const isTeacher = role === 'teacher';

  if (isLoading && !classInfo) {
    return (
      <div className="flex flex-col gap-8">
        <header>
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
          <div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
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

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">{classInfo.name}</h1>
        <p className="text-muted-foreground">{classInfo.description || 'Manage assignments, students, and settings for this class.'}</p>
      </header>

      <Tabs defaultValue={searchParams.get('tab') || "assignments"} className="w-full">
        <TabsList className={`grid w-full ${isTeacher ? 'grid-cols-6' : 'grid-cols-4'}`}>
          <TabsTrigger value="assignments"><FileText className="mr-2 h-4 w-4" /> Assignments</TabsTrigger>
          <TabsTrigger value="materials"><BookOpen className="mr-2 h-4 w-4" /> Materials</TabsTrigger>
          <TabsTrigger value="announcements"><Bell className="mr-2 h-4 w-4" /> Announcements</TabsTrigger>
          {isTeacher && (
            <>
              <TabsTrigger value="analytics"><BarChart3 className="mr-2 h-4 w-4" /> Analytics</TabsTrigger>
              <TabsTrigger value="students"><Users className="mr-2 h-4 w-4" /> Students</TabsTrigger>
              <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" /> Settings</TabsTrigger>
            </>
          )}
        </TabsList>
        <TabsContent value="assignments">
          <AssignmentList assignments={classAssignments} classId={classId} isTeacher={isTeacher} />
        </TabsContent>
        <TabsContent value="announcements">
          <AnnouncementManager classId={classId} isTeacher={isTeacher} />
        </TabsContent>
        {isTeacher && (
          <TabsContent value="analytics">
            <ClassAnalyticsDashboard classId={classId} />
          </TabsContent>
        )}
           <TabsContent value="materials">
            <MaterialList materials={materials} classId={classId} isLoading={!!isLoading} isTeacher={isTeacher} />
          </TabsContent>
          <TabsContent value="chapters">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <ChapterNavigation
                  classId={classId}
                  selectedChapterId={selectedChapterId}
                  onChapterSelect={setSelectedChapterId}
                  onCreateChapter={() => setSelectedChapterId('new')}
                  isTeacher={isTeacher}
                />
              </div>
              <div className="lg:col-span-3">
                {isTeacher ? (
                  <ChapterEditor
                    classId={classId}
                    chapterId={selectedChapterId || 'new'}
                    onChapterUpdated={() => {
                      // Could refresh navigation here
                      setSelectedChapterId(undefined);
                    }}
                  />
                ) : selectedChapterId ? (
                  <ChapterContentViewer
                    classId={classId}
                    chapterId={selectedChapterId}
                    isTeacher={isTeacher}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <GraduationCap className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Select a chapter from the sidebar to view its content.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          {isTeacher && (
            <>
              <TabsContent value="students">
                 <StudentList students={students} isLoading={!!isLoading} classInfo={classInfo as { id: string; name: string; join_code: string | null }} />
              </TabsContent>
              <TabsContent value="settings">
                <ClassSettings
                   classId={classId}
                   className={classInfo.name}
                   isArchived={classInfo.status === 'archived'}
                   onArchive={() => window.location.href = '/classes'} />
              </TabsContent>
            </>
          )}
      </Tabs>
    </div>
  );
}