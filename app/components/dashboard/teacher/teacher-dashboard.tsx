
'use client';

import { useState, useContext, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  PlusCircle,
  Search,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Rows3,
  ArrowUpRight
} from 'lucide-react';
import { ClassCard } from './class-card';
import { CreateClassDialog } from './create-class-dialog';
import { AppContext, AppContextType, ClassInfo } from '@/contexts/app-context';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export function TeacherDashboard() {
  const { classes, createClass, isLoading, refetchClasses } = useContext(AppContext) as AppContextType;
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allClasses, setAllClasses] = useState<ClassInfo[]>([]);
  const [archivedClassesCount, setArchivedClassesCount] = useState(0);
  const [manageView, setManageView] = useState<'list' | 'grid'>('list');
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();

  const handleJoinClass = async () => {
    if (!joinCode.trim()) {
      toast({ variant: 'destructive', title: 'Please enter a join code' });
      return;
    }

    setIsJoining(true);
    try {
      const response = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_code: joinCode.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({ title: data.message || 'Successfully joined class!' });
        setJoinCode('');
        await refetchClasses();
      } else {
        throw new Error(data.error || 'Failed to join class');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not join class', description: error.message });
    } finally {
      setIsJoining(false);
    }
  };

  // Fetch all classes including archived when toggling
  const fetchAllClasses = async (includeArchived = false) => {
    try {
      const params = includeArchived ? '?includeArchived=true' : '';
      const response = await fetch(`/api/classes${params}`);
      if (response.ok) {
        const data = await response.json();
        setAllClasses(data);
        // Count archived classes
        const archived = data.filter((cls: ClassInfo) => cls.status === 'archived');
        setArchivedClassesCount(archived.length);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  // Update allClasses when classes context changes
  useEffect(() => {
    setAllClasses(classes || []);
    // Fetch archived count separately
    fetchAllClasses(true).then(() => {
      // This will update archivedClassesCount
    });
  }, [classes]);

  const handleClassCreated = async (newClass: { name: string; description: string | null }): Promise<ClassInfo | null> => {
     try {
      const createdClass = await createClass(newClass);
      toast({
        title: 'Class Created',
        description: `"${newClass.name}" has been successfully created.`,
      });
      await refetchClasses();
      return createdClass;
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not create the class. Please try again.',
      });
      return null;
    }
  };

  // Handle toggling archived classes view
  const handleToggleArchived = async () => {
    if (!showArchived) {
      // Fetch classes including archived ones
      await fetchAllClasses(true);
    } else {
      // Revert to normal classes
      await refetchClasses();
    }
    setShowArchived(!showArchived);
  };

  if (isLoading || !classes) {
      return (
        <div className="flex flex-col gap-8">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64" />)}
            </div>
        </div>
      )
  }

  const filteredClasses = allClasses.filter(cls =>
    cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cls.description && cls.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sort classes alphabetically for consistent ordering
  const sortedFilteredClasses = [...filteredClasses].sort((a, b) => a.name.localeCompare(b.name));
  const activeClasses = sortedFilteredClasses.filter(cls => cls.status !== 'archived');
  const archivedClasses = sortedFilteredClasses.filter(cls => cls.status === 'archived');

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border/70 surface-panel p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Class Access</h2>
          <p className="text-sm text-muted-foreground">
            Create a new class or join an existing class with a teacher code.
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Input
            placeholder="Enter teacher join code..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="h-9 w-full md:max-w-xs"
            onKeyDown={(e) => e.key === 'Enter' && handleJoinClass()}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleJoinClass}
              disabled={isJoining || !joinCode.trim()}
              size="sm"
            >
              {isJoining ? 'Joining...' : 'Join Class'}
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Class
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/70 surface-panel p-4">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold">Manage Classes</h2>
          <p className="text-sm text-muted-foreground">
            Keep class settings organized from one place.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full"
          />
            </div>
            <div className="inline-flex rounded-md border border-border/70 p-0.5">
              <Button
                type="button"
                size="sm"
                variant={manageView === 'list' ? 'default' : 'ghost'}
                className="h-8 px-2"
                onClick={() => setManageView('list')}
                aria-label="List view"
              >
                <Rows3 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant={manageView === 'grid' ? 'default' : 'ghost'}
                className="h-8 px-2"
                onClick={() => setManageView('grid')}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {activeClasses.length === 0 && archivedClasses.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <h3 className="text-2xl font-bold tracking-tight">
                You haven't created any classes yet.
              </h3>
              <p className="text-sm text-muted-foreground">
                Create a class to start adding assignments and students.
              </p>
              <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Class
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Classes - Always Visible */}
            <div className="min-h-[400px]">
              {manageView === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeClasses.map((classInfo, index) => (
                    <ClassCard
                      key={classInfo.id}
                      classInfo={classInfo}
                      isArchived={false}
                      isBulkMode={false}
                      isSelected={false}
                      priority={index < 12} // Load first 12 classes immediately
                      onToggleSelect={() => {}}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border/70">
                  <div className="grid grid-cols-[minmax(0,1fr)_130px] items-center border-b bg-muted/30 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid-cols-[minmax(0,1.2fr)_220px_130px]">
                    <span>Class</span>
                    <span className="hidden md:block">Status</span>
                    <span className="text-right">Action</span>
                  </div>
                  <div>
                    {activeClasses.map((classInfo) => (
                      <div
                        key={classInfo.id}
                        className={cn(
                          'grid grid-cols-[minmax(0,1fr)_130px] items-center border-b px-3 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.2fr)_220px_130px]',
                          'bg-background'
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{classInfo.name}</p>
                          </div>
                          {classInfo.description && (
                            <p className="truncate pl-0 text-xs text-muted-foreground md:pl-6">
                              {classInfo.description}
                            </p>
                          )}
                        </div>
                        <div className="hidden md:block">
                          <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                            Active
                          </span>
                        </div>
                        <div className="text-right">
                          <Button asChild size="sm" variant="outline" className="h-8 bg-sidebar-accent/35 hover:bg-sidebar-accent/60">
                        <Link prefetch={false} href={`/class/${classInfo.id}?tab=group`}>
                              Open
                              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Archived Classes Toggle */}
            {archivedClassesCount > 0 && (
              <div className="text-center pt-8 pb-4">
                <Button
                  variant="outline"
                  onClick={handleToggleArchived}
                  className="rounded-full"
                >
                  {showArchived ? (
                    <>
                      <ChevronUp className="mr-2 h-4 w-4" />
                      Hide Archived Classes ({archivedClassesCount})
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" />
                      Show Archived Classes ({archivedClassesCount})
                    </>
                  )}
                </Button>

                {showArchived && (
                  <div className="mt-8 space-y-4">
                    <h2 className="text-xl font-semibold text-muted-foreground">Archived Classes</h2>
                    {manageView === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {archivedClasses.map((classInfo) => (
                          <ClassCard
                            key={classInfo.id}
                            classInfo={classInfo}
                            isArchived={true}
                            isBulkMode={false}
                            isSelected={false}
                            onToggleSelect={() => {}}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-border/70">
                        {archivedClasses.map((classInfo) => (
                          <div
                            key={classInfo.id}
                            className={cn(
                              'grid grid-cols-[minmax(0,1fr)_130px] items-center border-b px-3 py-3 last:border-b-0',
                              'bg-background'
                            )}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium">{classInfo.name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                                Archived
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <CreateClassDialog
        isOpen={isCreateDialogOpen}
        setIsOpen={setIsCreateDialogOpen}
        onClassCreated={handleClassCreated}
      />
    </div>
  );
}

