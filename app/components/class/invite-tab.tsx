'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Clock, Users, BookUser, Eye, EyeOff, Copy, Check, Loader2, Link as LinkIcon, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { DEFAULT_CLASS_PREFERENCES, normalizeClassPreferences } from '@/lib/class-preferences';
import { logClassTabEvent } from '@/lib/class-tab-telemetry';

type InviteDraft = {
  classId: string;
  studentEmails: string[];
  teacherEmails: string[];
  scheduledTime: string | null;
  showTeacherSection: boolean;
};

const STORAGE_KEY = 'class-invite-drafts';

export function InviteTab({ classId, joinCode, teacherJoinCode }: { classId: string; joinCode: string; teacherJoinCode?: string }) {
  const { toast } = useToast();
  const [studentEmails, setStudentEmails] = useState<string[]>(['']);
  const [teacherEmails, setTeacherEmails] = useState<string[]>(['']);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [showTeacherSection, setShowTeacherSection] = useState(false);
  const [copiedStudent, setCopiedStudent] = useState(false);
  const [copiedTeacher, setCopiedTeacher] = useState(false);
  const [copiedTeacherLink, setCopiedTeacherLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_CLASS_PREFERENCES);
  const [oneTimeTeacherCode, setOneTimeTeacherCode] = useState<string>('');
  const [oneTimeTeacherCodeExpiresAt, setOneTimeTeacherCodeExpiresAt] = useState<string | null>(null);
  const [isGeneratingTeacherCode, setIsGeneratingTeacherCode] = useState(false);

  const studentInviteLink = joinCode ? `${typeof window !== 'undefined' ? window.location.origin : ''}/classes?join_code=${joinCode}` : '';
  const teacherInviteLink = oneTimeTeacherCode ? `${typeof window !== 'undefined' ? window.location.origin : ''}/classes/join/${oneTimeTeacherCode}` : '';
  const studentQrCodeUrl = studentInviteLink ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(studentInviteLink)}&format=png` : '';
  const teacherQrCodeUrl = teacherInviteLink ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(teacherInviteLink)}&format=png` : '';

  useEffect(() => {
    void logClassTabEvent({
      classId,
      tab: 'invite',
      event: 'mount',
      stage: 'ui',
      level: 'info',
    });

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const drafts: InviteDraft[] = JSON.parse(saved);
        const draft = drafts.find(d => d.classId === classId);
        if (draft) {
          setStudentEmails(draft.studentEmails.length > 0 ? draft.studentEmails : ['']);
          setTeacherEmails(draft.teacherEmails.length > 0 ? draft.teacherEmails : ['']);
          setScheduledTime(draft.scheduledTime || '');
          setShowTeacherSection(draft.showTeacherSection);
        }
      } catch (e) {
        console.error('Failed to load drafts:', e);
      }
    }
  }, [classId]);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch(`/api/classes/${classId}`);
        if (!response.ok) return;
        const data = await response.json();
        setPreferences(normalizeClassPreferences(data.preferences || {}));
      } catch {
        setPreferences(DEFAULT_CLASS_PREFERENCES);
      }
    };
    void loadPreferences();
  }, [classId]);

  const saveDraft = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let drafts: InviteDraft[] = saved ? JSON.parse(saved) : [];
    const existingIndex = drafts.findIndex(d => d.classId === classId);
    
    const newDraft: InviteDraft = {
      classId,
      studentEmails: studentEmails.filter(e => e.trim() !== ''),
      teacherEmails: teacherEmails.filter(e => e.trim() !== ''),
      scheduledTime: scheduledTime || null,
      showTeacherSection,
    };
    
    if (existingIndex >= 0) {
      drafts[existingIndex] = newDraft;
    } else {
      drafts.push(newDraft);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  };

  useEffect(() => {
    const timeout = setTimeout(saveDraft, 500);
    return () => clearTimeout(timeout);
  }, [studentEmails, teacherEmails, scheduledTime, showTeacherSection, classId]);

  const addStudentEmail = () => setStudentEmails([...studentEmails, '']);
  const removeStudentEmail = (index: number) => {
    if (studentEmails.length > 1) setStudentEmails(studentEmails.filter((_, i) => i !== index));
  };
  const updateStudentEmail = (index: number, value: string) => {
    const updated = [...studentEmails];
    updated[index] = value;
    setStudentEmails(updated);
  };

  const addTeacherEmail = () => setTeacherEmails([...teacherEmails, '']);
  const removeTeacherEmail = (index: number) => {
    if (teacherEmails.length > 1) setTeacherEmails(teacherEmails.filter((_, i) => i !== index));
  };
  const updateTeacherEmail = (index: number, value: string) => {
    const updated = [...teacherEmails];
    updated[index] = value;
    setTeacherEmails(updated);
  };

  const copyToClipboard = async (text: string, type: 'code' | 'link' | 'teacher' | 'teacherLink') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') { setCopiedStudent(true); setTimeout(() => setCopiedStudent(false), 2000); }
      else if (type === 'link') { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
      else if (type === 'teacher') { setCopiedTeacher(true); setTimeout(() => setCopiedTeacher(false), 2000); }
      else { setCopiedTeacherLink(true); setTimeout(() => setCopiedTeacherLink(false), 2000); }
      toast({ title: 'Copied to clipboard!' });
      void logClassTabEvent({
        classId,
        tab: 'invite',
        event: 'copy_to_clipboard',
        stage: 'action',
        level: 'debug',
        meta: { type },
      });
    } catch (e) { toast({ title: 'Failed to copy', variant: 'destructive' }); }
  };

  const sendInvites = async () => {
    const validStudentEmails = studentEmails.filter(e => e.trim() !== '').filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()));
    const validTeacherEmails = preferences.invite_allow_teacher_invites
      ? teacherEmails.filter(e => e.trim() !== '').filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()))
      : [];

    if (validStudentEmails.length === 0 && validTeacherEmails.length === 0) {
      toast({ title: 'No valid emails to send', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    void logClassTabEvent({
      classId,
      tab: 'invite',
      event: 'send_invites_start',
      stage: 'action',
      level: 'info',
      meta: { student_count: validStudentEmails.length, teacher_count: validTeacherEmails.length, scheduled: Boolean(scheduledTime) },
    });
    try {
      const response = await fetch(`/api/classes/${classId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentEmails: validStudentEmails, teacherEmails: validTeacherEmails, scheduledTime: scheduledTime || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send invites');

      toast({ 
        title: data.message || 'Invites sent!',
        description: scheduledTime ? `Will be sent at ${format(new Date(scheduledTime), 'PPp')}` : `${data.results?.students?.invited?.length || 0} student, ${data.results?.teachers?.invited?.length || 0} teacher invites`
      });
      void logClassTabEvent({
        classId,
        tab: 'invite',
        event: 'send_invites_success',
        stage: 'action',
        level: 'info',
      });
      setStudentEmails(['']); setTeacherEmails(['']); setScheduledTime(''); saveDraft();
    } catch (e: any) {
      void logClassTabEvent({
        classId,
        tab: 'invite',
        event: 'send_invites_error',
        stage: 'action',
        level: 'error',
        message: e?.message || 'Unknown error',
      });
      toast({ title: e.message || 'Failed to send invites', variant: 'destructive' });
    } finally { setIsSending(false); }
  };

  const generateOneTimeTeacherCode = async () => {
    if (!preferences.invite_allow_teacher_invites) return;
    setIsGeneratingTeacherCode(true);
    try {
      const response = await fetch(`/api/classes/${classId}/teacher-invite-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expires_in_minutes: 60 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate teacher code');
      setOneTimeTeacherCode(data?.code?.code || '');
      setOneTimeTeacherCodeExpiresAt(data?.code?.expires_at || null);
      toast({ title: 'One-time teacher code created (valid for 60 minutes)' });
      void logClassTabEvent({
        classId,
        tab: 'invite',
        event: 'teacher_code_generated',
        stage: 'action',
        level: 'info',
      });
    } catch (error: any) {
      toast({ title: error?.message || 'Failed to generate teacher code', variant: 'destructive' });
      void logClassTabEvent({
        classId,
        tab: 'invite',
        event: 'teacher_code_generate_error',
        stage: 'action',
        level: 'error',
        message: error?.message || 'Unknown error',
      });
    } finally {
      setIsGeneratingTeacherCode(false);
    }
  };

  const validStudentEmails = studentEmails.filter(e => e.trim() !== '');

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Invite Students
          </CardTitle>
          <CardDescription className="text-sm">
            Share the join code, QR code, or invite link with students to join your class.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <section className="rounded-xl bg-[hsl(var(--surface-2))] p-4">
            <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              {studentQrCodeUrl ? (
                <div className="flex flex-col items-center gap-2 rounded-lg bg-[hsl(var(--surface-1))] p-3">
                  <img src={studentQrCodeUrl} alt="QR Code" width={140} height={140} className="rounded" />
                  <p className="text-xs text-muted-foreground">Scan to join</p>
                </div>
              ) : null}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Join Code</Label>
                  <div className="flex gap-2">
                    <Input type="text" value={joinCode || 'Loading...'} readOnly className="font-mono text-base" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(joinCode || '', 'code')}>
                      {copiedStudent ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {studentInviteLink ? (
                  <div className="space-y-1.5">
                    <Label className="text-sm">Invite Link</Label>
                    <div className="flex gap-2">
                      <Input type="text" value={studentInviteLink} readOnly className="text-sm" />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(studentInviteLink, 'link')}>
                        {copiedLink ? <Check className="h-4 w-4 text-green-600" /> : <LinkIcon className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-[hsl(var(--surface-2))] p-4 space-y-3">
            <Label className="text-sm">Email Invites (optional)</Label>
            {studentEmails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <Input type="email" placeholder="student@example.com" value={email} onChange={(e) => updateStudentEmail(index, e.target.value)} className="flex-1" />
                {studentEmails.length > 1 ? (
                  <Button variant="ghost" size="icon" onClick={() => removeStudentEmail(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addStudentEmail} className="gap-1">
              <Plus className="h-4 w-4" /> Add Another Email
            </Button>
          </section>

          <section className="rounded-xl bg-[hsl(var(--surface-2))] p-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Schedule (optional)
              </Label>
              <Input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
              {scheduledTime ? <p className="text-xs text-muted-foreground">Will be sent at {format(new Date(scheduledTime), 'PPp')}</p> : null}
            </div>
            {validStudentEmails.length > 0 ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={sendInvites} disabled={isSending} className="gap-2 btn-send-coral sm:min-w-[180px]">
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {isSending ? 'Sending...' : 'Send Now'}
                </Button>
                {scheduledTime ? (
                  <Button onClick={sendInvites} disabled={isSending} variant="outline" className="gap-2">
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                    {isSending ? 'Scheduling...' : `Schedule for ${format(new Date(scheduledTime), 'PPp')}`}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </section>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookUser className="h-5 w-5" />
              Invite Teachers
            </CardTitle>
            {preferences.invite_allow_teacher_invites ? (
              <Button variant="ghost" size="sm" onClick={() => setShowTeacherSection(!showTeacherSection)} className="gap-1">
                {showTeacherSection ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showTeacherSection ? 'Hide' : 'Show'}
              </Button>
            ) : null}
          </div>
          <CardDescription className="text-sm">
            Invite other teachers to collaborate. {preferences.invite_allow_teacher_invites ? 'Teacher invites are enabled.' : 'Teacher invites are disabled in Manage settings.'}
          </CardDescription>
        </CardHeader>

        {preferences.invite_allow_teacher_invites && showTeacherSection ? (
          <CardContent className="space-y-4">
            <section className="rounded-xl bg-[hsl(var(--surface-2))] p-4">
              <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                {teacherQrCodeUrl ? (
                  <div className="flex flex-col items-center gap-2 rounded-lg bg-[hsl(var(--surface-1))] p-3">
                    <img src={teacherQrCodeUrl} alt="Teacher QR Code" width={140} height={140} className="rounded" />
                    <p className="text-xs text-muted-foreground">Scan to join as teacher</p>
                  </div>
                ) : null}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">One-Time Teacher Join Code</Label>
                    <div className="flex gap-2">
                      <Input type="text" value={oneTimeTeacherCode || ''} readOnly placeholder="Generate one-time code" className="font-mono text-base" />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(oneTimeTeacherCode || '', 'teacher')} disabled={!oneTimeTeacherCode}>
                        {copiedTeacher ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={generateOneTimeTeacherCode} disabled={isGeneratingTeacherCode}>
                      {isGeneratingTeacherCode ? 'Generating...' : 'Generate 1-hour one-time code'}
                    </Button>
                    {oneTimeTeacherCodeExpiresAt ? (
                      <p className="text-xs text-muted-foreground">Expires at {new Date(oneTimeTeacherCodeExpiresAt).toLocaleString()}</p>
                    ) : null}
                  </div>
                  {teacherInviteLink ? (
                    <div className="space-y-1.5">
                      <Label className="text-sm">Teacher Invite Link</Label>
                      <div className="flex gap-2">
                        <Input type="text" value={teacherInviteLink} readOnly className="text-sm" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(teacherInviteLink, 'teacherLink')}>
                          {copiedTeacherLink ? <Check className="h-4 w-4 text-green-600" /> : <LinkIcon className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-xl bg-[hsl(var(--surface-2))] p-4 space-y-3">
              <Label className="text-sm">Email Invites</Label>
              {teacherEmails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input type="email" placeholder="teacher@example.com" value={email} onChange={(e) => updateTeacherEmail(index, e.target.value)} className="flex-1" />
                  {teacherEmails.length > 1 ? (
                    <Button variant="ghost" size="icon" onClick={() => removeTeacherEmail(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addTeacherEmail} className="gap-1">
                <Plus className="h-4 w-4" /> Add Another Teacher
              </Button>
              {teacherEmails.filter(e => e.trim() !== '').length > 0 ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={sendInvites} disabled={isSending} className="gap-2 btn-send-coral sm:min-w-[180px]">
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    {isSending ? 'Sending...' : 'Send Now'}
                  </Button>
                  {scheduledTime ? (
                    <Button onClick={sendInvites} disabled={isSending} variant="outline" className="gap-2">
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                      {isSending ? 'Scheduling...' : `Schedule for ${format(new Date(scheduledTime), 'PPp')}`}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </section>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}


