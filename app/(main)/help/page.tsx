'use client';

import { useContext } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HelpPage() {
  const { language } = useContext(AppContext) as AppContextType;
  const locale = (language || 'en').toLowerCase();
  const tr = (values: Partial<Record<string, string>>) => values[locale] || values.en || '';

  const faqGroups: Array<{ section: string; items: Array<{ q: string; a: string }> }> = [
    {
      section: tr({ en: 'Getting started', nl: 'Aan de slag' }),
      items: [
        {
          q: tr({ en: 'How do I join a class as a student?', nl: 'Hoe neem ik deel aan een klas als leerling?' }),
          a: tr({ en: 'Go to Classes in the sidebar and click "Join a Class". Enter the code from your teacher. You\'ll see the class immediately after joining.', nl: 'Ga naar Klassen in de zijbalk en klik op "Klasse deelnemen". Voer de code van je docent in. Je ziet de klas direct na deelname.' }),
        },
        {
          q: tr({ en: 'How do I create a class as a teacher?', nl: 'Hoe maak ik een klas aan als docent?' }),
          a: tr({ en: 'Use the "+ New class" button in the left sidebar or the class switcher at the top. You\'ll be asked for a class name, optional description, and first subject.', nl: 'Gebruik de knop "+ Nieuwe klas" in de linker zijbalk of de klassenwisselaar bovenin. Je voert een naam, optionele beschrijving en het eerste vak in.' }),
        },
        {
          q: tr({ en: 'Where is my dashboard?', nl: 'Waar is mijn dashboard?' }),
          a: tr({ en: 'Click the home icon or cautie logo in the sidebar. Students see their agenda, upcoming deadlines, and study tasks. Teachers see a class overview.', nl: 'Klik op het huis-icoon of het cautie-logo in de zijbalk. Leerlingen zien hun agenda, aankomende deadlines en studietaken. Docenten zien een klasoverzicht.' }),
        },
      ],
    },
    {
      section: tr({ en: 'Classes & subjects', nl: 'Klassen & vakken' }),
      items: [
        {
          q: tr({ en: 'What is the difference between a class and a subject?', nl: 'Wat is het verschil tussen een klas en een vak?' }),
          a: tr({ en: 'A class is a group of students (e.g. "3A"). A subject is the content area (e.g. "Biology"). One class can have multiple subjects.', nl: 'Een klas is een groep leerlingen (bv. "3A"). Een vak is het inhoudsgebied (bv. "Biologie"). Een klas kan meerdere vakken hebben.' }),
        },
        {
          q: tr({ en: 'Why do I see a different name in one class?', nl: 'Waarom zie ik een andere naam in een klas?' }),
          a: tr({ en: 'Teachers can set a class-scoped alias for you. It only applies to that class and doesn\'t affect your account name.', nl: 'Docenten kunnen een klasgebonden naam voor je instellen. Dit geldt alleen voor die klas en heeft geen invloed op je accountnaam.' }),
        },
        {
          q: tr({ en: 'How do I leave a class?', nl: 'Hoe verlaat ik een klas?' }),
          a: tr({ en: 'Go to Classes in the sidebar, find the class, and click "Leave class" below the class card.', nl: 'Ga naar Klassen in de zijbalk, vind de klas en klik op "Klasse verlaten" onder de klaskaart.' }),
        },
      ],
    },
    {
      section: tr({ en: 'Attendance', nl: 'Aanwezigheid' }),
      items: [
        {
          q: tr({ en: 'What do the attendance symbols mean?', nl: 'Wat betekenen de aanwezigheidssymbolen?' }),
          a: tr({ en: 'Check (✓) = present, X = absent, HW = homework incomplete, Late = arrived late. Each change is logged with the teacher\'s name and a timestamp.', nl: 'Check (✓) = aanwezig, X = afwezig, HW = huiswerk onvolledig, Laat = te laat. Elke wijziging wordt gelogd met de naam van de docent en een tijdstip.' }),
        },
        {
          q: tr({ en: 'Can I see my attendance history?', nl: 'Kan ik mijn aanwezigheidshistorie bekijken?' }),
          a: tr({ en: 'Teachers can view per-student attendance in the class Attendance tab. Students can see their summary in the class Group tab.', nl: 'Docenten kunnen de aanwezigheid per leerling bekijken in het tabblad Aanwezigheid. Leerlingen zien een overzicht in het tabblad Groep.' }),
        },
      ],
    },
    {
      section: tr({ en: 'Tools & studying', nl: 'Tools & studeren' }),
      items: [
        {
          q: tr({ en: 'What tools are available?', nl: 'Welke tools zijn beschikbaar?' }),
          a: tr({ en: 'Quiz generator, Flashcard maker, Notes, Mindmap, Timeline, and Studyset. Find them under "Tools" in the sidebar.', nl: 'Quizgenerator, Flashcard maker, Notities, Mindmap, Tijdlijn en Studieset. Vind ze onder "Tools" in de zijbalk.' }),
        },
        {
          q: tr({ en: 'Where do my tool results go?', nl: 'Waar gaan mijn toolresultaten naartoe?' }),
          a: tr({ en: 'All tool runs are saved automatically. Find recent results in the "Recents" panel at the bottom of the sidebar.', nl: 'Alle toolresultaten worden automatisch opgeslagen. Vind recente resultaten in het "Recent"-paneel onderaan de zijbalk.' }),
        },
        {
          q: tr({ en: 'What is a Studyset?', nl: 'Wat is een Studieset?' }),
          a: tr({ en: 'A Studyset bundles a subject\'s content into a focused study plan with tasks for each day. Create one from the Studyset tool page.', nl: 'Een Studieset bundelt de inhoud van een vak in een gefocust studieplan met taken per dag. Maak er een via de Studieset-pagina.' }),
        },
      ],
    },
    {
      section: tr({ en: 'Assignments & grades', nl: 'Opdrachten & cijfers' }),
      items: [
        {
          q: tr({ en: 'How do I submit an assignment?', nl: 'Hoe lever ik een opdracht in?' }),
          a: tr({ en: 'Open the assignment from your agenda or the subject page and use the submit button at the bottom.', nl: 'Open de opdracht vanuit je agenda of de vakpagina en gebruik de knop Inleveren onderaan.' }),
        },
        {
          q: tr({ en: 'Where can I see my grades?', nl: 'Waar kan ik mijn cijfers zien?' }),
          a: tr({ en: 'Grades are visible in the class Grades tab (teachers) or on the assignment detail page after grading.', nl: 'Cijfers zijn zichtbaar in het tabblad Cijfers (docenten) of op de opdrachtdetailpagina na nakijken.' }),
        },
      ],
    },
    {
      section: tr({ en: 'Account & settings', nl: 'Account & instellingen' }),
      items: [
        {
          q: tr({ en: 'How do I change my display name?', nl: 'Hoe verander ik mijn weergavenaam?' }),
          a: tr({ en: 'Go to Settings → Personalization. Enter your preferred name and click Save.', nl: 'Ga naar Instellingen → Personalisatie. Voer je gewenste naam in en klik op Opslaan.' }),
        },
        {
          q: tr({ en: 'How do I switch the language to Dutch?', nl: 'Hoe zet ik de taal op Nederlands?' }),
          a: tr({ en: 'Go to Settings → Personalization and select "Nederlands (Dutch)" from the Language dropdown.', nl: 'Ga naar Instellingen → Personalisatie en kies "Nederlands (Dutch)" in de Taal-keuzelijst.' }),
        },
        {
          q: tr({ en: 'Where do I find log codes?', nl: 'Waar vind ik logcodes?' }),
          a: tr({ en: 'Open the "Log codes" tab in Settings and type in the code (e.g. EVT-ATT-001) for a full explanation.', nl: 'Open het tabblad "Logcodes" in Instellingen en typ de code in (bv. EVT-ATT-001) voor een volledige uitleg.' }),
        },
      ],
    },
  ];

  return (
    <div className="page-content">
      <PageHeader title={tr({ en: 'Help & FAQ', nl: 'Help & FAQ' })} />
      <Card className="border-0 surface-panel shadow-none">
        <CardHeader>
          <CardTitle>{tr({ en: 'Help & FAQ', nl: 'Help & FAQ' })}</CardTitle>
          <CardDescription>
            {tr({ en: 'Answers to common questions about cautie.', nl: 'Antwoorden op veelgestelde vragen over cautie.' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {faqGroups.map(({ section, items }) => (
            <div key={section} className="space-y-3">
              <p className="text-sm text-muted-foreground">{section}</p>
              <div className="space-y-2">
                {items.map(({ q, a }) => (
                  <div key={q} className="rounded-xl surface-interactive p-4">
                    <p className="text-sm font-medium text-foreground">{q}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
