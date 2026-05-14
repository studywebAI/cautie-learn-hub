'use client';

import { useState, useEffect, useContext } from 'react';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { Copy, Check } from 'lucide-react';

type ClassData = {
  id: string;
  name: string;
  description?: string;
  join_code?: string;
  teacher_join_code?: string;
  is_archived?: boolean;
};

type Teacher = {
  id: string;
  name: string;
  role: 'owner' | 'teacher';
};

const SECTIONS = ['classinfo', 'access', 'features', 'appearance'] as const;
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
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  useEffect(() => {
    void loadSettings();
  }, [classId]);

  async function loadSettings() {
    setLoading(true);
    try {
      const [classRes, groupRes, shareRes] = await Promise.allSettled([
        fetch(`/api/classes/${classId}`),
        fetch(`/api/classes/${classId}/group`),
        fetch(`/api/classes/${classId}/share/settings`),
      ]);

      if (classRes.status === 'fulfilled' && classRes.value.ok) {
        const data = await classRes.value.json();
        setClassData(data.class || data);
        setEditName(data.class?.name || className);
        setEditDesc(data.class?.description || '');
      }

      if (groupRes.status === 'fulfilled' && groupRes.value.ok) {
        const data = await groupRes.value.json();
        setTeachers(data.teachers || []);
      }

      if (shareRes.status === 'fulfilled' && shareRes.value.ok) {
        const data = await shareRes.value.json();
        const settings = data.settings || {};
        setStudentChatEnabled(settings.allChatEnabled !== false);
        setTeacherChatEnabled(settings.teacherChatEnabled !== false);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, code: string) {
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
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
              appearance: { en: 'Appearance', nl: 'Uiterlijk' },
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
            {activeSection === 'appearance' && (isDutch ? 'Uiterlijk' : 'Appearance')}
          </h2>
          <p className="text-[12px] text-muted-foreground mt-1">
            {activeSection === 'classinfo' && (isDutch ? 'Basisgegevens over uw klas' : 'Basic information about your class')}
            {activeSection === 'access' && (isDutch ? 'Beheer docenten en student access' : 'Manage teachers and student access')}
            {activeSection === 'features' && (isDutch ? 'Schakel tabs en functies in/uit' : 'Enable or disable features')}
            {activeSection === 'appearance' && (isDutch ? 'Aanpassingsopties voor het thema' : 'Theme customization')}
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

              <SettingField
                label={isDutch ? 'Deelcode student' : 'Student Join Code'}
                description={isDutch ? 'Students gebruiken dit om in te schrijven' : 'Students use this to join'}
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={classData?.join_code || ''}
                    readOnly
                    className="flex-1 px-3 py-2 text-[13px] border border-border rounded-md bg-muted text-foreground"
                  />
                  <button
                    onClick={() => copyToClipboard(classData?.join_code || '', 'student')}
                    className="px-3 py-2 text-[12px] font-500 border border-border rounded-md bg-white hover:bg-muted transition-colors dark:bg-[hsl(var(--surface-2))]"
                  >
                    {copiedCode === 'student' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </SettingField>

              <SettingField
                label={isDutch ? 'Deelcode docent' : 'Teacher Join Code'}
                description={isDutch ? 'Andere docenten kunnen met dit code deelnemen' : 'Other teachers can join with this code'}
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={classData?.teacher_join_code || ''}
                    readOnly
                    className="flex-1 px-3 py-2 text-[13px] border border-border rounded-md bg-muted text-foreground"
                  />
                  <button
                    onClick={() => copyToClipboard(classData?.teacher_join_code || '', 'teacher')}
                    className="px-3 py-2 text-[12px] font-500 border border-border rounded-md bg-white hover:bg-muted transition-colors dark:bg-[hsl(var(--surface-2))]"
                  >
                    {copiedCode === 'teacher' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
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
                  {teachers.map((teacher, idx) => (
                    <div key={teacher.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-[13px] font-500 text-foreground">{teacher.name}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">{teacher.role}</p>
                      </div>
                      {teacher.role !== 'owner' && (
                        <select className="text-[12px] border border-border rounded-md px-2 py-1 bg-background">
                          <option>Teacher</option>
                          <option>Owner</option>
                        </select>
                      )}
                    </div>
                  ))}
                </div>
                <button className="mt-3 px-3 py-2 text-[12px] font-500 bg-[#7f8962] text-white rounded-md hover:bg-[#6f7851] transition-colors">
                  + {isDutch ? 'Docent toevoegen' : 'Add Teacher'}
                </button>
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

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <div className="space-y-4">
              <SettingField
                label={isDutch ? 'Thema' : 'Theme'}
                description=""
              >
                <select className="w-full px-3 py-2 text-[13px] border border-border rounded-md bg-background">
                  <option>{isDutch ? 'Automatisch (OS-instelling)' : 'Auto (OS setting)'}</option>
                  <option>{isDutch ? 'Licht' : 'Light'}</option>
                  <option>{isDutch ? 'Donker' : 'Dark'}</option>
                </select>
              </SettingField>

              <SettingField
                label={isDutch ? 'Kleurenschema' : 'Color Scheme'}
                description=""
              >
                <select className="w-full px-3 py-2 text-[13px] border border-border rounded-md bg-background">
                  <option>{isDutch ? 'Standaard (Sage Groen)' : 'Default (Sage Green)'}</option>
                  <option>{isDutch ? 'Erfenis (Blauw)' : 'Legacy (Blue)'}</option>
                  <option>{isDutch ? 'Zand (Warm tan)' : 'Sand (Warm tan)'}</option>
                </select>
              </SettingField>
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
        onClick={() => onChange(!enabled)}
        className={cn(
          'w-10 h-6 rounded-full transition-colors relative',
          enabled ? 'bg-[#7f8962]' : 'bg-border'
        )}
      >
        <div
          className={cn(
            'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform',
            enabled ? 'translate-x-4.5' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}
