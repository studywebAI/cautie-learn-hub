'use client';

import { useState, useEffect, useContext } from 'react';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { Copy, Check, Loader2 } from 'lucide-react';

type ClassData = {
  id: string;
  name: string;
  description?: string;
};

type Teacher = {
  id: string;
  name: string;
};

const SECTIONS = ['classinfo', 'access', 'features', 'invite'] as const;
type Section = (typeof SECTIONS)[number];

export function ClassSettingsRedesigned({
  classId,
  className,
  isArchived,
}: {
  classId: string;
  className: string;
  isArchived: boolean;
}) {
  const ctx = useContext(AppContext) as AppContextType | null;
  const isDutch = ctx?.language === 'nl';

  const [activeSection, setActiveSection] = useState<Section>('classinfo');
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editName, setEditName] = useState(className);
  const [editDesc, setEditDesc] = useState('');

  const [studentChatEnabled, setStudentChatEnabled] = useState(true);
  const [teacherChatEnabled, setTeacherChatEnabled] = useState(true);

  const [tabVisibility, setTabVisibility] = useState<Record<string, boolean>>({
    group: true,
    schedule: true,
    share: true,
    grades: true,
    analytics: true,
    logs: true,
  });

  // Invite section state
  const [studentEmails, setStudentEmails] = useState<string[]>(['']);
  const [teacherEmails, setTeacherEmails] = useState<string[]>(['']);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [joinCode, setJoinCode] = useState<string>('');
  const [teacherJoinCode, setTeacherJoinCode] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [isGeneratingTeacherCode, setIsGeneratingTeacherCode] = useState(false);
  const [oneTimeTeacherCode, setOneTimeTeacherCode] = useState<string>('');
  const [oneTimeTeacherCodeExpiresAt, setOneTimeTeacherCodeExpiresAt] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedTeacherCode, setCopiedTeacherCode] = useState(false);
  const [copiedStudentLink, setCopiedStudentLink] = useState(false);
  const [copiedTeacherLink, setCopiedTeacherLink] = useState(false);

  const studentInviteLink = joinCode ? `${typeof window !== 'undefined' ? window.location.origin : ''}/classes?join_code=${joinCode}` : '';
  const teacherInviteLink = oneTimeTeacherCode ? `${typeof window !== 'undefined' ? window.location.origin : ''}/classes/join/${oneTimeTeacherCode}` : '';
  const studentQrCodeUrl = studentInviteLink ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(studentInviteLink)}&format=png` : '';
  const teacherQrCodeUrl = teacherInviteLink ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(teacherInviteLink)}&format=png` : '';

  useEffect(() => {
    void loadSettings();
  }, [classId]);

  async function loadSettings() {
    setLoading(true);
    try {
      const [classRes, groupRes, shareRes, codesRes] = await Promise.allSettled([
        fetch(`/api/classes/${classId}`),
        fetch(`/api/classes/${classId}/group`),
        fetch(`/api/classes/${classId}/share/settings`),
        fetch(`/api/classes/${classId}/share/codes`),
      ]);

      if (classRes.status === 'fulfilled' && classRes.value.ok) {
        const data = await classRes.value.json();
        setClassData(data.class || data);
        setEditName(data.class?.name || className);
        setEditDesc(data.class?.description || '');
      }

      if (groupRes.status === 'fulfilled' && groupRes.value.ok) {
        const data = await groupRes.value.json();
        const rawTeachers = data.teachers || [];
        setTeachers(rawTeachers.map((t: any) => ({ id: t.id, name: t.name || t.full_name || t.email || t.id })));
      }

      if (shareRes.status === 'fulfilled' && shareRes.value.ok) {
        const data = await shareRes.value.json();
        const settings = data.settings || {};
        setStudentChatEnabled(settings.allChatEnabled !== false);
        setTeacherChatEnabled(settings.teacherChatEnabled !== false);
      }

      if (codesRes.status === 'fulfilled' && codesRes.value.ok) {
        const data = await codesRes.value.json();
        setJoinCode(data.student_code || '');
        setTeacherJoinCode(data.teacher_code || '');
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }

  async function saveChatSettings() {
    setSaving(true);
    try {
      await fetch(`/api/classes/${classId}/share/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            allChatEnabled: studentChatEnabled,
            teacherChatEnabled: teacherChatEnabled,
          },
        }),
      });
    } catch (e) {
    } finally {
      setSaving(false);
    }
  }

  async function copyToClipboard(text: string, type: 'code' | 'teacherCode' | 'link' | 'teacherLink') {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') setCopiedCode(true);
      else if (type === 'teacherCode') setCopiedTeacherCode(true);
      else if (type === 'link') setCopiedStudentLink(true);
      else setCopiedTeacherLink(true);
      setTimeout(() => {
        setCopiedCode(false);
        setCopiedTeacherCode(false);
        setCopiedStudentLink(false);
        setCopiedTeacherLink(false);
      }, 2000);
    } catch (e) {}
  }

  async function generateOneTimeTeacherCode() {
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
    } catch (error: any) {
      setInviteStatus({ ok: false, msg: error?.message || (isDutch ? 'Fout bij genereren code' : 'Error generating code') });
    } finally {
      setIsGeneratingTeacherCode(false);
    }
  }

  async function sendInvites() {
    const validStudents = studentEmails.map(e => e.trim()).filter(e => e.includes('@'));
    const validTeachers = teacherEmails.map(e => e.trim()).filter(e => e.includes('@'));
    if (!validStudents.length && !validTeachers.length) {
      setInviteStatus({ ok: false, msg: isDutch ? 'Voer minstens één e-mailadres in.' : 'Enter at least one email address.' });
      return;
    }
    setSendingInvite(true);
    setInviteStatus(null);
    try {
      const res = await fetch(`/api/classes/${classId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmails: validStudents,
          teacherEmails: validTeachers,
          scheduledTime: scheduledTime || undefined,
        }),
      });
      if (res.ok) {
        setStudentEmails(['']);
        setTeacherEmails(['']);
        setScheduledTime('');
        setInviteStatus({ ok: true, msg: isDutch ? 'Uitnodigingen verzonden!' : 'Invitations sent!' });
      } else {
        const d = await res.json().catch(() => ({}));
        setInviteStatus({ ok: false, msg: d.error || (isDutch ? 'Mislukt.' : 'Failed.') });
      }
    } catch {
      setInviteStatus({ ok: false, msg: isDutch ? 'Fout bij verzenden.' : 'Error sending invites.' });
    } finally {
      setSendingInvite(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <CautieLoader size="md" label="" sublabel="" />
      </div>
    );
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: '220px 1fr' }}>
      {/* Sidebar Navigation */}
      <div className="rounded-lg border border-border bg-white dark:bg-[hsl(var(--surface-1))]">
        <nav className="flex flex-col">
          {SECTIONS.map((section, idx) => {
            const labels: Record<Section, { en: string; nl: string }> = {
              classinfo: { en: 'Class Info', nl: 'Klasinfo' },
              access: { en: 'Access', nl: 'Toegang' },
              features: { en: 'Features', nl: 'Functies' },
              invite: { en: 'Invite', nl: 'Uitnodigen' },
            };
            const label = labels[section];

            return (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={cn(
                  'px-4 py-3 text-[13px] font-500 text-left transition-colors',
                  idx > 0 && 'border-t border-border',
                  activeSection === section
                    ? 'bg-[#7f8962] text-white'
                    : 'text-foreground/70 hover:bg-muted'
                )}
              >
                {isDutch ? label.nl : label.en}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="rounded-lg border border-border bg-white dark:bg-[hsl(var(--surface-1))]">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-[16px] font-semibold text-foreground">
            {activeSection === 'classinfo' && (isDutch ? 'Klasinformatie' : 'Class Information')}
            {activeSection === 'access' && (isDutch ? 'Toegang & Leden' : 'Access & Members')}
            {activeSection === 'features' && (isDutch ? 'Functies' : 'Features')}
            {activeSection === 'invite' && (isDutch ? 'Uitnodigen' : 'Invite')}
          </h2>
          <p className="text-[12px] text-muted-foreground mt-1">
            {activeSection === 'classinfo' && (isDutch ? 'Basisgegevens over uw klas' : 'Basic information about your class')}
            {activeSection === 'access' && (isDutch ? 'Beheer docenten en student access' : 'Manage teachers and student access')}
            {activeSection === 'features' && (isDutch ? 'Schakel tabs en functies in/uit' : 'Enable or disable features')}
            {activeSection === 'invite' && (isDutch ? 'Nodig studenten en docenten uit via e-mail' : 'Invite students and teachers by email')}
          </p>
        </div>

        <div className="px-6 py-5">
          {/* Class Info Section */}
          {activeSection === 'classinfo' && (
            <div className="space-y-4">
              <SettingField
                label={isDutch ? 'Klasnaam' : 'Class Name'}
                description={isDutch ? 'Hoe students uw klas zien' : 'How students see your class'}
              >
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:border-[#7f8962]"
                />
              </SettingField>

              <SettingField
                label={isDutch ? 'Beschrijving' : 'Description'}
                description={isDutch ? 'Optioneel' : 'Optional'}
              >
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:border-[#7f8962] resize-none"
                  rows={3}
                />
              </SettingField>

              {!isArchived && (
                <SettingField
                  label={isDutch ? 'Klas archiveren' : 'Archive Class'}
                  description={isDutch ? 'Archived classes are read-only' : 'Archived classes are read-only'}
                >
                  <button className="px-3 py-2 text-[12px] font-500 bg-red-600/10 text-red-600 rounded-md hover:bg-red-600/20 transition-colors">
                    {isDutch ? 'Archiveren' : 'Archive'}
                  </button>
                </SettingField>
              )}
            </div>
          )}

          {/* Access Section */}
          {activeSection === 'access' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[13px] font-600 text-foreground mb-3">
                  {isDutch ? 'Docenten in deze klas' : 'Teachers in this class'}
                </h3>
                <div className="border border-border rounded-md divide-y divide-border">
                  {teachers.length === 0 ? (
                    <div className="px-4 py-3 text-[12px] text-muted-foreground">
                      {isDutch ? 'Geen docenten gevonden.' : 'No teachers found.'}
                    </div>
                  ) : teachers.map((teacher) => (
                    <div key={teacher.id} className="flex items-center px-4 py-3">
                      <p className="text-[13px] font-500 text-foreground">{teacher.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-[13px] font-600 text-foreground mb-3">
                  {isDutch ? 'Student-instellingen' : 'Student Settings'}
                </h3>
                <div className="space-y-3">
                  <Toggle
                    label={isDutch ? 'Students kunnen elkaar zien' : 'Students can see each other'}
                    description={isDutch ? 'In groepslijsten en profielen' : 'In group lists and profiles'}
                    enabled={true}
                    onChange={() => {}}
                  />
                  <Toggle
                    label={isDutch ? 'Students kunnen messages sturen' : 'Students can send messages'}
                    description={isDutch ? 'In chat- en share-tabs' : 'In chat and share tabs'}
                    enabled={studentChatEnabled}
                    onChange={setStudentChatEnabled}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Features Section */}
          {activeSection === 'features' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[13px] font-600 text-foreground mb-3">
                  {isDutch ? 'Tabs' : 'Tabs'}
                </h3>
                <div className="space-y-3">
                  {Object.entries(tabVisibility).map(([tab, enabled]) => (
                    <Toggle
                      key={tab}
                      label={tab.charAt(0).toUpperCase() + tab.slice(1)}
                      description=""
                      enabled={enabled}
                      onChange={val => setTabVisibility(prev => ({ ...prev, [tab]: val }))}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-[13px] font-600 text-foreground mb-3">
                  {isDutch ? 'Functies' : 'Features'}
                </h3>
                <div className="space-y-3">
                  <Toggle
                    label={isDutch ? 'Aanwezigheid' : 'Attendance'}
                    description={isDutch ? 'Aanwezigheidsregistratie' : 'Attendance tracking'}
                    enabled={true}
                    onChange={() => {}}
                  />
                  <Toggle
                    label={isDutch ? 'Huiswerk' : 'Homework'}
                    description={isDutch ? 'Toewijzing en tracking' : 'Assignment and tracking'}
                    enabled={true}
                    onChange={() => {}}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Invite Section — expanded with QR codes, join codes, links, and teacher codes */}
          {activeSection === 'invite' && (
            <div className="space-y-6">
              {/* Student invites */}
              <div>
                <h3 className="text-[13px] font-600 text-foreground mb-3">
                  {isDutch ? 'Studenten uitnodigen' : 'Invite students'}
                </h3>

                {/* Student QR and codes */}
                <div className="mb-4 grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)]">
                  {studentQrCodeUrl && (
                    <div className="flex flex-col items-center gap-2 rounded-md bg-muted p-3">
                      <img src={studentQrCodeUrl} alt="Student QR Code" width={140} height={140} className="rounded" />
                      <p className="text-[11px] text-muted-foreground text-center">{isDutch ? 'Scannen om toe te treden' : 'Scan to join'}</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {joinCode && (
                      <div>
                        <p className="text-[11px] font-500 text-foreground mb-1.5">{isDutch ? 'Deelcode' : 'Join Code'}</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={joinCode}
                            readOnly
                            className="flex-1 px-3 py-2 text-[13px] border border-border rounded-md bg-background font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard(joinCode, 'code')}
                            className="p-2 border border-border rounded-md hover:bg-muted transition-colors"
                          >
                            {copiedCode ? <Check className="h-4 w-4 text-[#7f8962]" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                    {studentInviteLink && (
                      <div>
                        <p className="text-[11px] font-500 text-foreground mb-1.5">{isDutch ? 'Invitatie-link' : 'Invite Link'}</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={studentInviteLink}
                            readOnly
                            className="flex-1 px-3 py-2 text-[11px] border border-border rounded-md bg-background truncate"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard(studentInviteLink, 'link')}
                            className="p-2 border border-border rounded-md hover:bg-muted transition-colors"
                          >
                            {copiedStudentLink ? <Check className="h-4 w-4 text-[#7f8962]" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email invites */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[11px] font-500 text-foreground mb-2">{isDutch ? 'E-mailuitnodigingen (optioneel)' : 'Email invitations (optional)'}</p>
                  <div className="space-y-2">
                    {studentEmails.map((email, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={e => {
                            const next = [...studentEmails];
                            next[idx] = e.target.value;
                            setStudentEmails(next);
                          }}
                          placeholder={isDutch ? 'student@school.nl' : 'student@school.com'}
                          className="flex-1 px-3 py-2 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:border-[#7f8962]"
                        />
                        {studentEmails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setStudentEmails(prev => prev.filter((_, i) => i !== idx))}
                            className="px-2 text-[12px] text-muted-foreground hover:text-foreground"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setStudentEmails(prev => [...prev, ''])}
                      className="text-[12px] text-[#7f8962] hover:underline"
                    >
                      + {isDutch ? 'e-mailadres toevoegen' : 'add email'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Scheduling */}
              <div className="pt-4 border-t border-border">
                <p className="text-[11px] font-500 text-foreground mb-2">{isDutch ? 'Inplannen (optioneel)' : 'Schedule (optional)'}</p>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:border-[#7f8962]"
                />
                {scheduledTime && <p className="text-[11px] text-muted-foreground mt-1">{isDutch ? 'Wordt verzonden op: ' : 'Will be sent at: '}{new Date(scheduledTime).toLocaleString()}</p>}
              </div>

              {/* Teacher invites */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-[13px] font-600 text-foreground mb-3">
                  {isDutch ? 'Docenten uitnodigen' : 'Invite teachers'}
                </h3>

                {/* Teacher one-time code generation */}
                <button
                  type="button"
                  onClick={() => void generateOneTimeTeacherCode()}
                  disabled={isGeneratingTeacherCode}
                  className="mb-4 rounded-md bg-[#7f8962] px-3 py-2 text-[12px] font-500 text-white hover:bg-[#6f7851] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isGeneratingTeacherCode ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {isGeneratingTeacherCode
                    ? (isDutch ? 'Genereren...' : 'Generating...')
                    : (isDutch ? 'Genereer 1-uur code' : 'Generate 1-hour code')}
                </button>

                {/* Teacher QR and codes */}
                {oneTimeTeacherCode && (
                  <div className="mb-4 grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)]">
                    {teacherQrCodeUrl && (
                      <div className="flex flex-col items-center gap-2 rounded-md bg-muted p-3">
                        <img src={teacherQrCodeUrl} alt="Teacher QR Code" width={140} height={140} className="rounded" />
                        <p className="text-[11px] text-muted-foreground text-center">{isDutch ? 'Docent QR' : 'Teacher QR'}</p>
                      </div>
                    )}
                    <div className="space-y-3">
                      <div>
                        <p className="text-[11px] font-500 text-foreground mb-1.5">{isDutch ? 'Eenmalige code' : 'One-time code'}</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={oneTimeTeacherCode}
                            readOnly
                            className="flex-1 px-3 py-2 text-[13px] border border-border rounded-md bg-background font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard(oneTimeTeacherCode, 'teacherCode')}
                            className="p-2 border border-border rounded-md hover:bg-muted transition-colors"
                          >
                            {copiedTeacherCode ? <Check className="h-4 w-4 text-[#7f8962]" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                        {oneTimeTeacherCodeExpiresAt && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {isDutch ? 'Verloopt: ' : 'Expires: '}{new Date(oneTimeTeacherCodeExpiresAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      {teacherInviteLink && (
                        <div>
                          <p className="text-[11px] font-500 text-foreground mb-1.5">{isDutch ? 'Docent-link' : 'Teacher link'}</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={teacherInviteLink}
                              readOnly
                              className="flex-1 px-3 py-2 text-[11px] border border-border rounded-md bg-background truncate"
                            />
                            <button
                              type="button"
                              onClick={() => copyToClipboard(teacherInviteLink, 'teacherLink')}
                              className="p-2 border border-border rounded-md hover:bg-muted transition-colors"
                            >
                              {copiedTeacherLink ? <Check className="h-4 w-4 text-[#7f8962]" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Email invites */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[11px] font-500 text-foreground mb-2">{isDutch ? 'E-mailuitnodigingen' : 'Email invitations'}</p>
                  <div className="space-y-2">
                    {teacherEmails.map((email, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={e => {
                            const next = [...teacherEmails];
                            next[idx] = e.target.value;
                            setTeacherEmails(next);
                          }}
                          placeholder={isDutch ? 'collega@school.nl' : 'colleague@school.com'}
                          className="flex-1 px-3 py-2 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:border-[#7f8962]"
                        />
                        {teacherEmails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setTeacherEmails(prev => prev.filter((_, i) => i !== idx))}
                            className="px-2 text-[12px] text-muted-foreground hover:text-foreground"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTeacherEmails(prev => [...prev, ''])}
                      className="text-[12px] text-[#7f8962] hover:underline"
                    >
                      + {isDutch ? 'docent toevoegen' : 'add teacher'}
                    </button>
                  </div>
                </div>
              </div>

              {inviteStatus && (
                <p className={cn('text-[12px]', inviteStatus.ok ? 'text-[#7f8962]' : 'text-red-600')}>
                  {inviteStatus.msg}
                </p>
              )}

              <button
                type="button"
                onClick={() => void sendInvites()}
                disabled={sendingInvite}
                className="rounded-md bg-[#7f8962] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#6f7851] disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {sendingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {sendingInvite ? (isDutch ? 'Verzenden...' : 'Sending...') : (isDutch ? 'Uitnodigingen sturen' : 'Send invitations')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingField({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 pb-5 border-b border-border last:border-0 last:mb-0 last:pb-0">
      <label className="block text-[13px] font-500 text-foreground mb-1">{label}</label>
      {description && <p className="text-[11px] text-muted-foreground mb-2">{description}</p>}
      {children}
    </div>
  );
}

function Toggle({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-md bg-muted/40">
      <div>
        <p className="text-[13px] font-500 text-foreground">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          'w-11 h-6 rounded-full transition-colors duration-200 relative shrink-0',
          enabled ? 'bg-[var(--accent-brand)]' : 'bg-muted-foreground/30'
        )}
      >
        <div
          className={cn(
            'w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform duration-200',
            enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}
