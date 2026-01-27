'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Settings, Bell, Mail, Smartphone } from 'lucide-react';

interface NotificationPreferences {
  announcement: boolean;
  submission_graded: boolean;
  assignment_due: boolean;
  assignment_created: boolean;
  class_invitation: boolean;
  ai_content_generated: boolean;
  ai_grading_completed: boolean;
  comment_added: boolean;
  deadline_reminder: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
}

interface NotificationPreferencesProps {
  className?: string;
}

export function NotificationPreferences({ className }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    announcement: true,
    submission_graded: true,
    assignment_due: true,
    assignment_created: true,
    class_invitation: true,
    ai_content_generated: true,
    ai_grading_completed: true,
    comment_added: true,
    deadline_reminder: true,
    email_enabled: true,
    push_enabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Notification preferences saved successfully.',
        });
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Configure how you want to be notified</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading preferences...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>Configure how you want to be notified</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Channels */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center">
            <Bell className="mr-2 h-4 w-4" />
            Notification Channels
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="email_enabled">Email Notifications</Label>
              </div>
              <Switch
                id="email_enabled"
                checked={preferences.email_enabled}
                onCheckedChange={(checked) => updatePreference('email_enabled', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="push_enabled">Push Notifications</Label>
              </div>
              <Switch
                id="push_enabled"
                checked={preferences.push_enabled}
                onCheckedChange={(checked) => updatePreference('push_enabled', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Individual Notification Types */}
        <div>
          <h4 className="text-sm font-medium mb-3">Notification Types</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="announcement">Class Announcements</Label>
              <Switch
                id="announcement"
                checked={preferences.announcement}
                onCheckedChange={(checked) => updatePreference('announcement', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="assignment_created">New Assignments</Label>
              <Switch
                id="assignment_created"
                checked={preferences.assignment_created}
                onCheckedChange={(checked) => updatePreference('assignment_created', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="assignment_due">Assignment Deadlines</Label>
              <Switch
                id="assignment_due"
                checked={preferences.assignment_due}
                onCheckedChange={(checked) => updatePreference('assignment_due', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="submission_graded">Graded Submissions</Label>
              <Switch
                id="submission_graded"
                checked={preferences.submission_graded}
                onCheckedChange={(checked) => updatePreference('submission_graded', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ai_content_generated">AI Content Generation</Label>
              <Switch
                id="ai_content_generated"
                checked={preferences.ai_content_generated}
                onCheckedChange={(checked) => updatePreference('ai_content_generated', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ai_grading_completed">AI Grading Completion</Label>
              <Switch
                id="ai_grading_completed"
                checked={preferences.ai_grading_completed}
                onCheckedChange={(checked) => updatePreference('ai_grading_completed', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="comment_added">New Comments</Label>
              <Switch
                id="comment_added"
                checked={preferences.comment_added}
                onCheckedChange={(checked) => updatePreference('comment_added', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="deadline_reminder">Deadline Reminders</Label>
              <Switch
                id="deadline_reminder"
                checked={preferences.deadline_reminder}
                onCheckedChange={(checked) => updatePreference('deadline_reminder', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        <Button onClick={savePreferences} disabled={isSaving} className="w-full">
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}