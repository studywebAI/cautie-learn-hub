'use client';

import { useContext, useMemo, useState } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LogsTabRedesigned } from '@/components/class/logs-tab-redesigned';
import { Search, Send, HelpCircle, ScrollText } from 'lucide-react';

type FaqItem = { q: string; a: string; keywords: string[] };
type FaqGroup = { section: string; items: FaqItem[] };

// Search matches literal words in q/a plus a small synonym map, so e.g. searching
// "wifi" surfaces connectivity-flavored articles even without that literal word.
const SYNONYMS: Record<string, string[]> = {
  wifi: ['connectivity', 'internet', 'connection', 'offline'],
  login: ['account access', 'sign in', 'signin', 'log in'],
  password: ['account access', 'sign in'],
  grade: ['cijfer', 'grading', 'score'],
  cijfer: ['grade', 'grading', 'score'],
  klas: ['class', 'group'],
  vak: ['subject'],
  huiswerk: ['homework', 'assignment'],
  opdracht: ['assignment', 'homework'],
  toets: ['test', 'exam', 'quiz'],
  rooster: ['schedule', 'timetable'],
  agenda: ['schedule', 'calendar', 'planning'],
};

export default function HelpPage() {
  const { language, session, classes } = useContext(AppContext) as AppContextType;
  const { toast } = useToast();
  const locale = (language || 'en').toLowerCase();
  const isDutch = locale === 'nl';
  const tr = (values: Partial<Record<string, string>>) => values[locale] || values.en || '';

  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [reachSubject, setReachSubject] = useState('');
  const [reachBody, setReachBody] = useState('');
  const [isSendingReach, setIsSendingReach] = useState(false);
  const [logsClassId, setLogsClassId] = useState<string>('');

  const teacherClasses = (classes || []).filter((c: any) => c.status !== 'archived');

  const faqGroups: FaqGroup[] = [
    {
      section: tr({ en: 'Getting started', nl: 'Aan de slag' }),
      items: [
        {
          q: tr({ en: 'How do I join a class as a student?', nl: 'Hoe neem ik deel aan een klas als leerling?' }),
          a: tr({ en: 'Go to Classes in the sidebar and click "Join a Class". Enter the code from your teacher. You\'ll see the class immediately after joining.', nl: 'Ga naar Klassen in de zijbalk en klik op "Klasse deelnemen". Voer de code van je docent in. Je ziet de klas direct na deelname.' }),
          keywords: ['join', 'class', 'code', 'deelnemen', 'klas'],
        },
        {
          q: tr({ en: 'How do I create a class as a teacher?', nl: 'Hoe maak ik een klas aan als docent?' }),
          a: tr({ en: 'Use the "+ New class" button in the left sidebar or the class switcher at the top. You\'ll be asked for a class name, optional description, and first subject.', nl: 'Gebruik de knop "+ Nieuwe klas" in de linker zijbalk of de klassenwisselaar bovenin. Je voert een naam, optionele beschrijving en het eerste vak in.' }),
          keywords: ['create', 'class', 'nieuwe klas'],
        },
        {
          q: tr({ en: 'Where is my dashboard?', nl: 'Waar is mijn dashboard?' }),
          a: tr({ en: 'Click the home icon or cautie logo in the sidebar. Students see their agenda, upcoming deadlines, and study tasks. Teachers see a class overview.', nl: 'Klik op het huis-icoon of het cautie-logo in de zijbalk. Leerlingen zien hun agenda, aankomende deadlines en studietaken. Docenten zien een klasoverzicht.' }),
          keywords: ['dashboard', 'home'],
        },
      ],
    },
    {
      section: tr({ en: 'Classes & subjects', nl: 'Klassen & vakken' }),
      items: [
        {
          q: tr({ en: 'What is the difference between a class and a subject?', nl: 'Wat is het verschil tussen een klas en een vak?' }),
          a: tr({ en: 'A class is a group of students (e.g. "3A"). A subject is the content area (e.g. "Biology"). One class can have multiple subjects.', nl: 'Een klas is een groep leerlingen (bv. "3A"). Een vak is het inhoudsgebied (bv. "Biologie"). Een klas kan meerdere vakken hebben.' }),
          keywords: ['class', 'subject', 'klas', 'vak'],
        },
        {
          q: tr({ en: 'Why do I see a different name in one class?', nl: 'Waarom zie ik een andere naam in een klas?' }),
          a: tr({ en: 'Teachers can set a class-scoped alias for you. It only applies to that class and doesn\'t affect your account name.', nl: 'Docenten kunnen een klasgebonden naam voor je instellen. Dit geldt alleen voor die klas en heeft geen invloed op je accountnaam.' }),
          keywords: ['name', 'alias', 'naam'],
        },
        {
          q: tr({ en: 'How do I leave a class?', nl: 'Hoe verlaat ik een klas?' }),
          a: tr({ en: 'Go to Classes in the sidebar, find the class, and click "Leave class" below the class card.', nl: 'Ga naar Klassen in de zijbalk, vind de klas en klik op "Klasse verlaten" onder de klaskaart.' }),
          keywords: ['leave', 'class', 'verlaten'],
        },
      ],
    },
    {
      section: tr({ en: 'Attendance', nl: 'Aanwezigheid' }),
      items: [
        {
          q: tr({ en: 'What do the attendance symbols mean?', nl: 'Wat betekenen de aanwezigheidssymbolen?' }),
          a: tr({ en: 'Check (✓) = present, X = absent, HW = homework incomplete, Late = arrived late. Each change is logged with the teacher\'s name and a timestamp.', nl: 'Check (✓) = aanwezig, X = afwezig, HW = huiswerk onvolledig, Laat = te laat. Elke wijziging wordt gelogd met de naam van de docent en een tijdstip.' }),
          keywords: ['attendance', 'symbols', 'aanwezigheid'],
        },
        {
          q: tr({ en: 'Can I see my attendance history?', nl: 'Kan ik mijn aanwezigheidshistorie bekijken?' }),
          a: tr({ en: 'Teachers can view per-student attendance in the class Attendance tab. Students can see their summary in the class Group tab.', nl: 'Docenten kunnen de aanwezigheid per leerling bekijken in het tabblad Aanwezigheid. Leerlingen zien een overzicht in het tabblad Groep.' }),
          keywords: ['attendance', 'history', 'aanwezigheid'],
        },
      ],
    },
    {
      section: tr({ en: 'Tools & studying', nl: 'Tools & studeren' }),
      items: [
        {
          q: tr({ en: 'What tools are available?', nl: 'Welke tools zijn beschikbaar?' }),
          a: tr({ en: 'Quiz generator, Flashcard maker, Notes, Mindmap, Timeline, and Studyset. Find them under "Tools" in the sidebar.', nl: 'Quizgenerator, Flashcard maker, Notities, Mindmap, Tijdlijn en Studieset. Vind ze onder "Tools" in de zijbalk.' }),
          keywords: ['tools', 'quiz', 'flashcard', 'notes', 'mindmap'],
        },
        {
          q: tr({ en: 'Where do my tool results go?', nl: 'Waar gaan mijn toolresultaten naartoe?' }),
          a: tr({ en: 'All tool runs are saved automatically. Find recent results in the "Recents" panel at the bottom of the sidebar.', nl: 'Alle toolresultaten worden automatisch opgeslagen. Vind recente resultaten in het "Recent"-paneel onderaan de zijbalk.' }),
          keywords: ['results', 'recents', 'save'],
        },
        {
          q: tr({ en: 'What is a Studyset?', nl: 'Wat is een Studieset?' }),
          a: tr({ en: 'A Studyset bundles a subject\'s content into a focused study plan with tasks for each day. Create one from the Studyset tool page.', nl: 'Een Studieset bundelt de inhoud van een vak in een gefocust studieplan met taken per dag. Maak er een via de Studieset-pagina.' }),
          keywords: ['studyset', 'study plan', 'studieset'],
        },
      ],
    },
    {
      section: tr({ en: 'Agenda, schedule & calendar', nl: 'Agenda, rooster & kalender' }),
      items: [
        {
          q: tr({ en: 'Where do I set my weekly class schedule?', nl: 'Waar stel ik mijn wekelijkse lesrooster in?' }),
          a: tr({ en: 'Open Agenda and click "Configure" — it opens your weekly schedule and class calendar events in one place.', nl: 'Open Agenda en klik op "Configureren" — dit opent je wekelijkse rooster en klaskalender op één plek.' }),
          keywords: ['schedule', 'rooster', 'configure', 'weekly'],
        },
        {
          q: tr({ en: 'Why don\'t I see the Schedule or Calendar tab on my class anymore?', nl: 'Waarom zie ik het tabblad Rooster of Kalender niet meer op mijn klas?' }),
          a: tr({ en: 'Both moved into Agenda so everything time-based lives in one view. Use the "Configure" button on the Agenda page instead.', nl: 'Beide zijn verplaatst naar Agenda zodat alles wat tijdgebonden is op één plek staat. Gebruik de knop "Configureren" op de Agenda-pagina.' }),
          keywords: ['schedule', 'calendar', 'moved', 'agenda', 'rooster', 'kalender'],
        },
      ],
    },
    {
      section: tr({ en: 'Assignments & grades', nl: 'Opdrachten & cijfers' }),
      items: [
        {
          q: tr({ en: 'How do I submit an assignment?', nl: 'Hoe lever ik een opdracht in?' }),
          a: tr({ en: 'Open the assignment from your agenda or the subject page and use the submit button at the bottom.', nl: 'Open de opdracht vanuit je agenda of de vakpagina en gebruik de knop Inleveren onderaan.' }),
          keywords: ['submit', 'assignment', 'inleveren', 'opdracht'],
        },
        {
          q: tr({ en: 'Where can I see my grades?', nl: 'Waar kan ik mijn cijfers zien?' }),
          a: tr({ en: 'Grades are visible in the class Grades tab (teachers) or on the assignment detail page after grading.', nl: 'Cijfers zijn zichtbaar in het tabblad Cijfers (docenten) of op de opdrachtdetailpagina na nakijken.' }),
          keywords: ['grades', 'cijfers'],
        },
      ],
    },
    {
      section: tr({ en: 'Account & settings', nl: 'Account & instellingen' }),
      items: [
        {
          q: tr({ en: 'How do I change my display name?', nl: 'Hoe verander ik mijn weergavenaam?' }),
          a: tr({ en: 'Go to Settings → Personalization. Enter your preferred name and click Save.', nl: 'Ga naar Instellingen → Personalisatie. Voer je gewenste naam in en klik op Opslaan.' }),
          keywords: ['name', 'display name', 'naam'],
        },
        {
          q: tr({ en: 'How do I switch the language to Dutch?', nl: 'Hoe zet ik de taal op Nederlands?' }),
          a: tr({ en: 'Go to Settings → Personalization and select "Nederlands (Dutch)" from the Language dropdown.', nl: 'Ga naar Instellingen → Personalisatie en kies "Nederlands (Dutch)" in de Taal-keuzelijst.' }),
          keywords: ['language', 'dutch', 'taal'],
        },
        {
          q: tr({ en: 'Where do I find log codes?', nl: 'Waar vind ik logcodes?' }),
          a: tr({ en: 'Open the "Log codes" tab in Settings and type in the code (e.g. EVT-ATT-001) for a full explanation.', nl: 'Open het tabblad "Logcodes" in Instellingen en typ de code in (bv. EVT-ATT-001) voor een volledige uitleg.' }),
          keywords: ['log codes', 'logcodes'],
        },
      ],
    },
  ];

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return faqGroups;

    const expandedTerms = new Set([query]);
    for (const [term, related] of Object.entries(SYNONYMS)) {
      if (query.includes(term)) related.forEach((r) => expandedTerms.add(r));
      if (related.some((r) => query.includes(r))) expandedTerms.add(term);
    }

    return faqGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const haystack = `${item.q} ${item.a} ${item.keywords.join(' ')}`.toLowerCase();
          return Array.from(expandedTerms).some((term) => haystack.includes(term));
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [search, faqGroups]);

  const handleSendReach = async () => {
    if (!reachSubject.trim() || !reachBody.trim()) return;
    setIsSendingReach(true);
    try {
      const response = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: reachSubject.trim(), body: reachBody.trim() }),
      });
      if (!response.ok) throw new Error('Failed to send');
      toast({ title: isDutch ? 'Bericht verzonden' : 'Message sent', description: isDutch ? 'We nemen zo snel mogelijk contact op.' : 'We\'ll get back to you as soon as possible.' });
      setReachSubject('');
      setReachBody('');
    } catch {
      toast({ title: isDutch ? 'Verzenden mislukt' : 'Failed to send', variant: 'destructive' });
    } finally {
      setIsSendingReach(false);
    }
  };

  const isTeacherLike = teacherClasses.length > 0;

  return (
    <div className="page-content">
      <PageHeader title={tr({ en: 'Help & FAQ', nl: 'Help & FAQ' })} />

      <Tabs defaultValue="faq" className="w-full">
        <TabsList>
          <TabsTrigger value="reach" className="gap-1.5"><Send className="h-3.5 w-3.5" />{tr({ en: 'Reach us', nl: 'Contact opnemen' })}</TabsTrigger>
          <TabsTrigger value="faq" className="gap-1.5"><HelpCircle className="h-3.5 w-3.5" />{tr({ en: 'Help & FAQ', nl: 'Help & FAQ' })}</TabsTrigger>
          {isTeacherLike && (
            <TabsTrigger value="logs" className="gap-1.5"><ScrollText className="h-3.5 w-3.5" />{tr({ en: 'My logs', nl: 'Mijn logs' })}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="reach">
          <Card className="border-0 surface-panel shadow-none">
            <CardHeader>
              <CardTitle>{tr({ en: 'Reach us', nl: 'Contact opnemen' })}</CardTitle>
              <CardDescription>
                {tr({
                  en: 'Send us a message and we\'ll get back to you. Direct email/phone support and a chatbot are coming later.',
                  nl: 'Stuur ons een bericht en we nemen contact op. Directe e-mail/telefoon-support en een chatbot volgen later.',
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-w-xl">
              <Input
                placeholder={tr({ en: 'Subject', nl: 'Onderwerp' })}
                value={reachSubject}
                onChange={(e) => setReachSubject(e.target.value)}
              />
              <Textarea
                placeholder={tr({ en: 'What can we help with?', nl: 'Waarmee kunnen we helpen?' })}
                value={reachBody}
                onChange={(e) => setReachBody(e.target.value)}
                rows={5}
              />
              <Button
                onClick={handleSendReach}
                disabled={isSendingReach || !reachSubject.trim() || !reachBody.trim()}
              >
                <Send className="mr-2 h-4 w-4" />
                {tr({ en: 'Send message', nl: 'Bericht versturen' })}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faq">
          <Card className="border-0 surface-panel shadow-none">
            <CardHeader className="space-y-3">
              <div>
                <CardTitle>{tr({ en: 'Help & FAQ', nl: 'Help & FAQ' })}</CardTitle>
                <CardDescription>
                  {tr({ en: 'Answers to common questions about cautie.', nl: 'Antwoorden op veelgestelde vragen over cautie.' })}
                </CardDescription>
              </div>
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={tr({ en: 'Search FAQ…', nl: 'Zoek in FAQ…' })}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {filteredGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tr({ en: 'No matching articles.', nl: 'Geen resultaten gevonden.' })}</p>
              ) : (
                filteredGroups.map(({ section, items }) => (
                  <div key={section} className="space-y-3">
                    <p className="text-sm text-muted-foreground">{section}</p>
                    <div className="space-y-2">
                      {items.map(({ q, a }) => {
                        const isOpen = openFaq === q;
                        return (
                          <button
                            type="button"
                            key={q}
                            onClick={() => setOpenFaq(isOpen ? null : q)}
                            className="block w-full rounded-xl surface-interactive p-4 text-left"
                          >
                            <p className="text-sm font-medium text-foreground">{q}</p>
                            {isOpen && <p className="mt-1 text-sm text-muted-foreground">{a}</p>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isTeacherLike && (
          <TabsContent value="logs">
            <Card className="border-0 surface-panel shadow-none">
              <CardHeader className="space-y-3">
                <div>
                  <CardTitle>{tr({ en: 'My logs', nl: 'Mijn logs' })}</CardTitle>
                  <CardDescription>
                    {tr({ en: 'Audit log activity for one of your classes.', nl: 'Auditlogactiviteit voor een van je klassen.' })}
                  </CardDescription>
                </div>
                {teacherClasses.length > 1 && (
                  <Select value={logsClassId || undefined} onValueChange={setLogsClassId}>
                    <SelectTrigger className="max-w-xs">
                      <SelectValue placeholder={tr({ en: 'Select a class', nl: 'Kies een klas' })} />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherClasses.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardHeader>
              <CardContent>
                {(logsClassId || teacherClasses[0]?.id) ? (
                  <LogsTabRedesigned classId={logsClassId || teacherClasses[0].id} />
                ) : (
                  <p className="text-sm text-muted-foreground">{tr({ en: 'No classes yet.', nl: 'Nog geen klassen.' })}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
