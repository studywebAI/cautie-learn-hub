'use client';

import { useState, useEffect, useContext } from 'react';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { Copy, Check, RefreshCw } from 'lucide-react';

type SubjectData = {
  id: string;
  title: string;
  description?: string | null;
  join_code?: string | null;
};

type Teacher = {
  id: string;
  name: string;
  isOwner: boolean;
};

type PendingRequest = {
  id: string;
  requesterId: string;
  email: string | null;
  role: 'student' | 'teacher';
  createdAt: string;
};

const SECTIONS = ['info', 'access', 'invite'] as const;
type Section = (typeof SECTIONS)[number];

// Mirrors app/components/dashboard/teacher/class-settings-redesigned.tsx's
// structure, scoped to subjects instead of classes -- subjects are the
// group now, so this is the settings surface that replaced it. Skips the
// old "Features" section (its toggles were non-functional no-ops even in
// the class version) and email invites (no subject-scoped invite endpoint
// exists) in favor of the working join-code flow subjects already have.
export function SubjectSettingsPanel({
  subjectId,
  subjectTitle,
}: {
  subjectId: string;
  subjectTitle: string;
}) {
  const ctx = useContext(AppContext) as AppContextType | null;
  const isDutch = ctx?.language === 'nl';

  const [activeSection, setActiveSection] = useState<Section>('info');
  const [subjectData, setSubjectData] = useState<SubjectData | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [editTitle, setEditTitle] = useState(subjectTitle);
  const [editDesc, setEditDesc] = useState('');

  useEffect(() => {
    void loadSettings();
  }, [subjectId]);

  async function loadSettings() {
    setLoading(true);
    try {
      const [subjectRes, teachersRes, requestsRes] = await Promise.allSettled([
        fetch(`/api/subjects/${subjectId}`),
        fetch(`/api/subjects/${subjectId}/teachers`),
        fetch(`/api/subjects/${subjectId}/join-requests`),
      ]);

      if (subjectRes.status === 'fulfilled' && subjectRes.value.ok) {
        const data = await subjectRes.value.json();
        setSubjectData(data);
        setEditTitle(data.title || subjectTitle);
        setEditDesc(data.description || '');
      }

      if (teachersRes.status === 'fulfilled' && teachersRes.value.ok) {
        const data = await teachersRes.value.json();
        setTeachers(data.teachers || []);
      }

      if (requestsRes.status === 'fulfilled' && requestsRes.value.ok) {
        const data = await requestsRes.value.json();
        setPendingRequests(data.requests || []);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }

  async function resolveRequest(requestId: string, action: 'approve' | 'reject') {
    setResolvingId(requestId);
    try {
      const res = await fetch(`/api/subjects/${subjectId}/join-requests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) await loadSettings();
    } finally {
      setResolvingId(null);
    }
  }

  async function saveProfile() {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/subjects/${subjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_profile', title: editTitle.trim(), description: editDesc.trim() }),
      });
      if (res.ok) await loadSettings();
    } finally {
      setSaving(false);
    }
  }

  async function regenerateJoinCode() {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/subjects/${subjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate_join_code' }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubjectData((prev) => (prev ? { ...prev, join_code: data.join_code } : prev));
      }
    } finally {
      setRegenerating(false);
    }
  }

  async function copyJoinCode() {
    if (!subjectData?.join_code) return;
    try {
      await navigator.clipboard.writeText(subjectData.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  const joinLink = subjectData?.join_code
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/subjects?join_code=${subjectData.join_code}`
    : '';

  async function copyJoinLink() {
    if (!joinLink) return;
    try {
      await navigator.clipboard.writeText(joinLink);
    } catch {}
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
      <div className="rounded-lg border border-border bg-background">
        <nav className="flex flex-col">
          {SECTIONS.map((section, idx) => {
            const labels: Record<Section, { en: string; nl: string }> = {
              info: { en: 'Subject Info', nl: 'Vakinfo' },
              access: { en: 'Access', nl: 'Toegang' },
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
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground/70 hover:bg-muted'
                )}
              >
                {isDutch ? label.nl : label.en}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="rounded-lg border border-border bg-background">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-[18px] text-foreground">
            {activeSection === 'info' && (isDutch ? 'Vakinformatie' : 'Subject Information')}
            {activeSection === 'access' && (isDutch ? 'Toegang & Docenten' : 'Access & Teachers')}
            {activeSection === 'invite' && (isDutch ? 'Uitnodigen' : 'Invite')}
          </h2>
          <p className="text-[12px] text-muted-foreground mt-1">
            {activeSection === 'info' && (isDutch ? 'Basisgegevens over dit vak' : 'Basic information about this subject')}
            {activeSection === 'access' && (isDutch ? 'Docenten met toegang tot dit vak' : 'Teachers with access to this subject')}
            {activeSection === 'invite' && (isDutch ? 'Studenten nemen deel via de deelnamecode' : 'Students join using the join code')}
          </p>
        </div>

        <div className="px-6 py-5">
          {activeSection === 'info' && (
            <div className="space-y-4">
              <SettingField
                label={isDutch ? 'Vaktitel' : 'Subject Title'}
                description={isDutch ? 'Hoe studenten dit vak zien' : 'How students see this subject'}
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:border-ring"
                />
              </SettingField>

              <SettingField
                label={isDutch ? 'Beschrijving' : 'Description'}
                description={isDutch ? 'Optioneel' : 'Optional'}
              >
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:border-ring resize-none"
                  rows={3}
                />
              </SettingField>

              <button
                onClick={saveProfile}
                disabled={saving || !editTitle.trim()}
                className="px-4 py-2 text-[13px] font-500 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? (isDutch ? 'Opslaan...' : 'Saving...') : (isDutch ? 'Opslaan' : 'Save')}
              </button>
            </div>
          )}

          {activeSection === 'access' && (
            <div className="space-y-6">
              {pendingRequests.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-600 text-foreground mb-3">
                    {isDutch ? 'Wachtende verzoeken' : 'Pending requests'}
                  </h3>
                  <div className="border border-border rounded-md divide-y divide-border">
                    {pendingRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-500 text-foreground">{req.email || req.requesterId}</p>
                          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded surface-interactive text-muted-foreground">
                            {req.role === 'teacher' ? (isDutch ? 'docent' : 'teacher') : (isDutch ? 'student' : 'student')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => resolveRequest(req.id, 'approve')}
                            disabled={resolvingId === req.id}
                            className="px-2.5 py-1 text-[12px] font-500 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
                          >
                            {isDutch ? 'Goedkeuren' : 'Approve'}
                          </button>
                          <button
                            onClick={() => resolveRequest(req.id, 'reject')}
                            disabled={resolvingId === req.id}
                            className="px-2.5 py-1 text-[12px] font-500 border border-border rounded-md hover:bg-muted disabled:opacity-50"
                          >
                            {isDutch ? 'Afwijzen' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-[13px] font-600 text-foreground mb-3">
                  {isDutch ? 'Docenten met toegang' : 'Teachers with access'}
                </h3>
                <div className="border border-border rounded-md divide-y divide-border">
                  {teachers.length === 0 ? (
                    <div className="px-4 py-3 text-[12px] text-muted-foreground">
                      {isDutch ? 'Geen docenten gevonden.' : 'No teachers found.'}
                    </div>
                  ) : teachers.map((teacher) => (
                    <div key={teacher.id} className="flex items-center justify-between px-4 py-3">
                      <p className="text-[13px] font-500 text-foreground">{teacher.name}</p>
                      {teacher.isOwner && (
                        <span className="text-[11px] text-muted-foreground">{isDutch ? 'Eigenaar' : 'Owner'}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'invite' && (
            <div className="space-y-4">
              <SettingField
                label={isDutch ? 'Deelnamecode' : 'Join code'}
                description={
                  isDutch
                    ? 'Zelfde code voor iedereen: studenten en docenten die de code invoeren vragen toegang aan, jij keurt ze goed of af (zie Toegang hierboven).'
                    : 'Same code for everyone: students and teachers entering it request access, you approve or reject them (see Access above).'
                }
              >
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 text-[15px] tracking-wide border border-border rounded-md bg-muted/40">
                    {subjectData?.join_code || '—'}
                  </code>
                  <button
                    onClick={copyJoinCode}
                    disabled={!subjectData?.join_code}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
                    title={isDutch ? 'Kopiëren' : 'Copy'}
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={regenerateJoinCode}
                    disabled={regenerating}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
                    title={isDutch ? 'Nieuwe code genereren' : 'Regenerate code'}
                  >
                    <RefreshCw className={cn('h-4 w-4', regenerating && 'animate-spin')} />
                  </button>
                </div>
              </SettingField>

              {subjectData?.join_code && (
                <SettingField
                  label={isDutch ? 'Deel-link met QR-code' : 'Share link with QR code'}
                  description={isDutch ? 'Scannen of de link openen vult de code automatisch in' : 'Scanning or opening the link fills in the code automatically'}
                >
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(joinLink)}`}
                      alt="QR code"
                      width={100}
                      height={100}
                      className="rounded-md border border-border"
                    />
                    <div className="flex-1 space-y-1.5">
                      <code className="block truncate px-3 py-2 text-[12px] border border-border rounded-md bg-muted/40">
                        {joinLink}
                      </code>
                      <button
                        onClick={copyJoinLink}
                        className="text-[12px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                      >
                        {isDutch ? 'Link kopiëren' : 'Copy link'}
                      </button>
                    </div>
                  </div>
                </SettingField>
              )}
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
