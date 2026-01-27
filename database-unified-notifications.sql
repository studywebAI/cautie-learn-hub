-- Unified Notification System Migration
-- Create a comprehensive notification system for all platform features

-- Create notifications table
CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "type" text NOT NULL CHECK (type IN ('announcement', 'submission_graded', 'assignment_due', 'assignment_created', 'class_invitation', 'ai_content_generated', 'ai_grading_completed', 'comment_added', 'deadline_reminder')),
    "title" text NOT NULL,
    "message" text,
    "data" jsonb DEFAULT '{}'::jsonb, -- Additional data specific to notification type
    "read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "expires_at" timestamp with time zone, -- Optional expiration for time-sensitive notifications
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Create user notification preferences table
CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "announcement" boolean DEFAULT true,
    "submission_graded" boolean DEFAULT true,
    "assignment_due" boolean DEFAULT true,
    "assignment_created" boolean DEFAULT true,
    "class_invitation" boolean DEFAULT true,
    "ai_content_generated" boolean DEFAULT true,
    "ai_grading_completed" boolean DEFAULT true,
    "comment_added" boolean DEFAULT true,
    "deadline_reminder" boolean DEFAULT true,
    "email_enabled" boolean DEFAULT true,
    "push_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notification_preferences_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "public"."notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "public"."notifications"("type");
CREATE INDEX IF NOT EXISTS "notifications_read_idx" ON "public"."notifications"("read");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "public"."notifications"("created_at");
CREATE INDEX IF NOT EXISTS "notifications_expires_at_idx" ON "public"."notifications"("expires_at");

-- Enable RLS
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (
    auth.uid() = user_id
);

CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (
    auth.uid() = user_id
);

CREATE POLICY "System can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (
    true -- Allow system-wide inserts for notifications
);

-- RLS Policies for notification preferences
CREATE POLICY "Users can view their own preferences" ON "public"."notification_preferences" FOR SELECT USING (
    auth.uid() = user_id
);

CREATE POLICY "Users can update their own preferences" ON "public"."notification_preferences" FOR UPDATE USING (
    auth.uid() = user_id
);

CREATE POLICY "Users can insert their own preferences" ON "public"."notification_preferences" FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id uuid,
    p_type text,
    p_title text,
    p_message text DEFAULT NULL,
    p_data jsonb DEFAULT '{}'::jsonb,
    p_expires_at timestamp with time zone DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    notification_id uuid;
    user_prefs record;
BEGIN
    -- Check user preferences
    SELECT * INTO user_prefs
    FROM notification_preferences
    WHERE user_id = p_user_id;

    -- If no preferences exist, create default ones
    IF user_prefs IS NULL THEN
        INSERT INTO notification_preferences (user_id)
        VALUES (p_user_id);
    END IF;

    -- Check if this notification type is enabled
    IF user_prefs IS NOT NULL AND NOT (user_prefs.email_enabled OR user_prefs.push_enabled) THEN
        -- Skip if all notifications are disabled
        RETURN NULL;
    END IF;

    -- Create the notification
    INSERT INTO notifications (user_id, type, title, message, data, expires_at)
    VALUES (p_user_id, p_type, p_title, p_message, p_data, p_expires_at)
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id uuid) RETURNS integer AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM notifications
        WHERE user_id = p_user_id
        AND read = false
        AND (expires_at IS NULL OR expires_at > now())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(p_user_id uuid, p_notification_ids uuid[] DEFAULT NULL) RETURNS void AS $$
BEGIN
    UPDATE notifications
    SET read = true, read_at = now()
    WHERE user_id = p_user_id
    AND (p_notification_ids IS NULL OR id = ANY(p_notification_ids))
    AND read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications() RETURNS void AS $$
BEGIN
    DELETE FROM notifications
    WHERE expires_at IS NOT NULL
    AND expires_at < now()
    AND read = true; -- Only delete read expired notifications
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers for automatic notifications
-- Trigger for new announcements
CREATE OR REPLACE FUNCTION notify_announcement_created() RETURNS trigger AS $$
BEGIN
    -- Notify all class members except the creator
    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT
        cm.user_id,
        'announcement',
        'New Announcement: ' || NEW.title,
        NEW.content,
        jsonb_build_object('announcement_id', NEW.id, 'class_id', NEW.class_id)
    FROM class_members cm
    WHERE cm.class_id = NEW.class_id
    AND cm.user_id != NEW.created_by;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_announcement_created
    AFTER INSERT ON announcements
    FOR EACH ROW EXECUTE FUNCTION notify_announcement_created();

-- Trigger for graded submissions
CREATE OR REPLACE FUNCTION notify_submission_graded() RETURNS trigger AS $$
BEGIN
    IF NEW.status = 'graded' AND OLD.status != 'graded' THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            NEW.user_id,
            'submission_graded',
            'Submission Graded',
            CASE
                WHEN NEW.grade IS NOT NULL THEN 'Your submission has been graded: ' || NEW.grade || '/100'
                ELSE 'Your submission has been graded with feedback'
            END,
            jsonb_build_object('submission_id', NEW.id, 'assignment_id', NEW.assignment_id, 'grade', NEW.grade)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_submission_graded
    AFTER UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION notify_submission_graded();

-- Trigger for new assignments
CREATE OR REPLACE FUNCTION notify_assignment_created() RETURNS trigger AS $$
BEGIN
    INSERT INTO notifications (user_id, type, title, message, data, expires_at)
    SELECT
        cm.user_id,
        'assignment_created',
        'New Assignment: ' || NEW.title,
        'A new assignment has been created with due date: ' || NEW.due_date,
        jsonb_build_object('assignment_id', NEW.id, 'class_id', NEW.class_id, 'due_date', NEW.due_date),
        NEW.due_date -- Expires when assignment is due
    FROM class_members cm
    WHERE cm.class_id = NEW.class_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_assignment_created
    AFTER INSERT ON assignments
    FOR EACH ROW EXECUTE FUNCTION notify_assignment_created();