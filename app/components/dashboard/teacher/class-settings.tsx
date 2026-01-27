'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Archive } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useContext } from 'react';
import { AppContext } from '@/contexts/app-context';

interface ClassSettingsProps {
  classId: string;
  className: string;
  onArchive?: () => void;
  isArchived?: boolean;
}

export function ClassSettings({ classId, className, onArchive, isArchived = false }: ClassSettingsProps) {
  const [isArchiving, setIsArchiving] = useState(false);
  const { refetchClasses } = useContext(AppContext) as any;

  const handleArchiveClass = async () => {
    setIsArchiving(true);
    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to archive class');
      }

      toast({
        title: 'Class archived',
        description: `${className} has been archived successfully.`,
      });

      // Refresh the classes list to reflect the archived status
      await refetchClasses();
      onArchive?.();
    } catch (error) {
      console.error('Error archiving class:', error);
      toast({
        title: 'Failed to archive class',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Class Settings</CardTitle>
          <CardDescription>
            Manage settings for {className}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!isArchived ? (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium text-red-600">Archive Class</h3>
                  <p className="text-sm text-muted-foreground">
                    Archiving this class will hide it from all users. The class data will be preserved but no longer accessible.
                    This action can only be undone by contacting support.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isArchiving}>
                      <Archive className="w-4 h-4 mr-2" />
                      {isArchiving ? 'Archiving...' : 'Archive Class'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Archive Class</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to archive "{className}"? This action cannot be undone.
                        The class will be hidden from all users but the data will be preserved.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleArchiveClass} className="bg-red-600 hover:bg-red-700">
                        Archive Class
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <div className="flex items-center justify-center p-4 border rounded-lg bg-gray-50">
                <div className="text-center">
                  <h3 className="font-medium text-gray-600">Class Archived</h3>
                  <p className="text-sm text-muted-foreground">
                    This class has been archived and is no longer accessible to students.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}