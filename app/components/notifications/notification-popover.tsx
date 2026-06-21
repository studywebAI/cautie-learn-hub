'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, AlertCircle, MessageSquare, Megaphone, BookOpen, Clock, Bot, Star, Link2, Users, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// ── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  data: any;
  read: boolean;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(dateString: string): string {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getTypeConfig(type: string): { icon: React.ReactNode; accent: string; label: string } {
  const cls = 'h-3.5 w-3.5';
  switch (type) {
    case 'error':
      return { icon: <AlertCircle className={cls} />, accent: 'text-destructive bg-destructive/10', label: 'Error' };
    case 'class_message':
      return { icon: <MessageSquare className={cls} />, accent: 'text-sky-600 bg-sky-500/10', label: 'Message' };
    case 'announcement':
      return { icon: <Megaphone className={cls} />, accent: 'text-blue-600 bg-blue-500/10', label: 'Announcement' };
    case 'assignment_created':
      return { icon: <BookOpen className={cls} />, accent: 'text-purple-600 bg-purple-500/10', label: 'Assignment' };
    case 'assignment_due':
    case 'deadline_reminder':
      return { icon: <Clock className={cls} />, accent: 'text-red-600 bg-red-500/10', label: 'Deadline' };
    case 'scheduled_study_item_due':
      return { icon: <Clock className={cls} />, accent: 'text-[var(--accent-brand)] bg-[var(--accent-brand)]/10', label: 'Scheduled' };
    case 'submission_graded':
    case 'ai_grading_completed':
      return { icon: <Star className={cls} />, accent: 'text-emerald-600 bg-emerald-500/10', label: 'Grade' };
    case 'ai_content_generated':
      return { icon: <Bot className={cls} />, accent: 'text-indigo-600 bg-indigo-500/10', label: 'AI' };
    case 'comment_added':
      return { icon: <MessageSquare className={cls} />, accent: 'text-orange-600 bg-orange-500/10', label: 'Comment' };
    case 'teacher_join_request':
      return { icon: <Users className={cls} />, accent: 'text-amber-600 bg-amber-500/10', label: 'Join request' };
    case 'teacher_join_request_result':
      return { icon: <Users className={cls} />, accent: 'text-cyan-600 bg-cyan-500/10', label: 'Request result' };
    case 'shared_item':
      return { icon: <Link2 className={cls} />, accent: 'text-sky-600 bg-sky-500/10', label: 'Shared' };
    default:
      return { icon: <HelpCircle className={cls} />, accent: 'text-muted-foreground bg-muted', label: type.replace(/_/g, ' ') };
  }
}

// ── NotificationItem ─────────────────────────────────────────────────────────

function NotificationItem({
  notification,
  index,
  onMarkAsRead,
  onAction,
  processingId,
}: {
  notification: Notification;
  index: number;
  onMarkAsRead: (id: string) => void;
  onAction: (notification: Notification, decision: 'approve' | 'reject') => void;
  processingId: string | null;
}) {
  const { icon, accent, label } = getTypeConfig(notification.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: 16, filter: 'blur(6px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className={cn(
        'group relative px-3 py-2.5 cursor-pointer transition-colors border-b border-border/50 last:border-b-0',
        notification.read ? 'hover:bg-muted/40' : 'bg-[var(--accent-brand)]/[0.04] hover:bg-[var(--accent-brand)]/[0.08]'
      )}
      onClick={() => onMarkAsRead(notification.id)}
    >
      <div className="flex items-start gap-2.5">
        {/* Type icon pill */}
        <div className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', accent)}>
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {!notification.read && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-brand)]" />
              )}
              <p className={cn('text-[12.5px] font-medium leading-snug truncate', !notification.read ? 'text-foreground' : 'text-foreground/80')}>
                {notification.title}
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {formatTimeAgo(notification.created_at)}
            </span>
          </div>

          {notification.message && (
            <p className="mt-0.5 text-[11.5px] text-muted-foreground line-clamp-2 leading-snug">
              {notification.message}
            </p>
          )}

          {/* Inline actions */}
          {notification.type === 'teacher_join_request' && (
            <div className="mt-2 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                className="h-6 px-2.5 text-[11px] bg-[var(--accent-brand)] text-white hover:opacity-90"
                onClick={() => onAction(notification, 'approve')}
                disabled={processingId === notification?.data?.request_id}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2.5 text-[11px]"
                onClick={() => onAction(notification, 'reject')}
                disabled={processingId === notification?.data?.request_id}
              >
                Reject
              </Button>
            </div>
          )}

          {notification.type === 'scheduled_study_item_due' && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2.5 text-[11px]"
                onClick={() => { window.location.href = '/agenda'; }}
              >
                Open agenda
              </Button>
            </div>
          )}

          {notification.type === 'shared_item' && notification?.data?.shared_url && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2.5 text-[11px]"
                onClick={() => { window.location.href = String(notification.data.shared_url); }}
              >
                Open
              </Button>
            </div>
          )}
        </div>

        {/* Mark read button (hover only) */}
        {!notification.read && (
          <button
            type="button"
            title="Mark as read"
            onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id); }}
            className="mt-0.5 hidden shrink-0 rounded p-0.5 text-muted-foreground/50 hover:text-[var(--accent-brand)] group-hover:flex transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface NotificationPopoverProps {
  className?: string;
}

export function NotificationPopover({ className }: NotificationPopoverProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=50');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.read).length);
    } catch {
      /* non-fatal */
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/mark-read');
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.count ?? 0);
    } catch { /* non-fatal */ }
  }, []);

  // Poll unread count every 30s; full fetch when panel is open
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    if (!isOpen) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15_000);
    return () => clearInterval(interval);
  }, [isOpen, fetchNotifications]);

  // ── Click outside ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const markAsRead = async (ids: string[], all = false) => {
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: all ? null : ids, mark_all: all }),
      });
      if (!res.ok) throw new Error();
      setNotifications((prev) =>
        prev.map((n) => (all || ids.includes(n.id) ? { ...n, read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => (all ? 0 : Math.max(0, prev - ids.length)));
    } catch {
      toast({ title: 'Error', description: 'Could not mark as read.', variant: 'destructive' });
    }
  };

  const handleAction = async (notification: Notification, decision: 'approve' | 'reject') => {
    const requestId = notification?.data?.request_id;
    const classId = notification?.data?.class_id;
    if (!requestId || !classId) return;
    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/classes/${classId}/teacher-join-requests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error);
      toast({ title: decision === 'approve' ? 'Teacher approved' : 'Teacher rejected' });
      await markAsRead([notification.id]);
      await fetchNotifications();
    } catch (err: any) {
      toast({ title: 'Action failed', description: err?.message || 'Could not process request', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Bell trigger */}
      <Button
        variant="outline"
        size="icon"
        className="relative h-8 w-8 rounded-lg"
        onClick={() => setIsOpen((o) => !o)}
        aria-label="Notifications"
      >
        <Bell className="h-3.5 w-3.5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-brand)] text-[11px] text-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 z-50 mt-2 w-[340px] rounded-xl border border-border bg-popover shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[14px] text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-[var(--accent-brand)]/15 px-1.5 py-0.5 text-[11px] font-medium text-[var(--accent-brand)]">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {notifications.some((n) => !n.read) && (
                <button
                  type="button"
                  onClick={() => markAsRead([], true)}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Body */}
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col gap-2 p-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-2.5 animate-pulse">
                      <div className="h-6 w-6 shrink-0 rounded-full bg-muted" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-2/3 rounded bg-muted" />
                        <div className="h-3 w-full rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-[13px] font-medium text-foreground">All caught up</p>
                  <p className="text-[12px] text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n, i) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    index={i}
                    onMarkAsRead={(id) => markAsRead([id])}
                    onAction={handleAction}
                    processingId={processingId}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
