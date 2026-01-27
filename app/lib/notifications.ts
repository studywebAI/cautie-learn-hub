// Notification utilities for the unified notification system

export interface NotificationData {
  type: 'announcement' | 'submission_graded' | 'assignment_due' | 'assignment_created' | 'class_invitation' | 'ai_content_generated' | 'ai_grading_completed' | 'comment_added' | 'deadline_reminder';
  title: string;
  message?: string;
  data?: Record<string, any>;
  expires_at?: string;
}

export class NotificationService {
  /**
   * Create a notification for a user
   */
  static async createNotification(userId: string, notification: NotificationData): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ...notification,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error creating notification:', error);
      return false;
    }
  }

  /**
   * Create notifications for multiple users
   */
  static async createBulkNotifications(userIds: string[], notification: NotificationData): Promise<boolean> {
    const promises = userIds.map(userId => this.createNotification(userId, notification));
    const results = await Promise.all(promises);
    return results.every(result => result);
  }

  /**
   * Get user notification preferences
   */
  static async getUserPreferences(userId?: string): Promise<Record<string, boolean> | null> {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return null;
    }
  }

  /**
   * Check if user wants notifications for a specific type
   */
  static async shouldNotifyUser(userId: string, type: string): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);
    if (!preferences) return true; // Default to true if no preferences set

    // Check if the notification type is enabled
    const typeEnabled = preferences[type as keyof typeof preferences];
    if (typeEnabled === false) return false;

    // Check if any notification channel is enabled
    return preferences.email_enabled || preferences.push_enabled;
  }

  /**
   * Helper to notify all class members except the sender
   */
  static async notifyClassMembers(classId: string, notification: NotificationData, excludeUserId?: string): Promise<void> {
    try {
      // This would need to be implemented server-side or we'd need a class members API
      // For now, this is a placeholder
      const response = await fetch(`/api/classes/${classId}/members`);
      if (!response.ok) return;

      const members = await response.json();
      const userIds = members
        .filter((member: any) => member.user_id !== excludeUserId)
        .map((member: any) => member.user_id);

      await this.createBulkNotifications(userIds, notification);
    } catch (error) {
      console.error('Error notifying class members:', error);
    }
  }
}

// Predefined notification templates
export const NotificationTemplates = {
  announcement: (title: string, content?: string) => ({
    type: 'announcement' as const,
    title: `New Announcement: ${title}`,
    message: content || 'Check the class for details.',
  }),

  assignmentCreated: (title: string, dueDate: string) => ({
    type: 'assignment_created' as const,
    title: `New Assignment: ${title}`,
    message: `Due date: ${new Date(dueDate).toLocaleDateString()}`,
    data: { due_date: dueDate },
  }),

  submissionGraded: (grade?: number) => ({
    type: 'submission_graded' as const,
    title: 'Submission Graded',
    message: grade ? `Your submission has been graded: ${grade}/100` : 'Your submission has been graded with feedback.',
    data: { grade },
  }),

  aiContentGenerated: (contentType: string) => ({
    type: 'ai_content_generated' as const,
    title: 'AI Content Generated',
    message: `Your ${contentType} has been generated successfully.`,
    data: { content_type: contentType },
  }),

  aiGradingCompleted: () => ({
    type: 'ai_grading_completed' as const,
    title: 'AI Grading Completed',
    message: 'AI-powered grading has been completed for your submissions.',
  }),
};