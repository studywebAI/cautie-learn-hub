/**
 * Tool workbench i18n strings for quiz, flashcards, and notes.
 * Keyed by locale → tool → section.
 */

import type { Locale } from '@/lib/get-dictionary';

type OptionDef = { value: string; label: string; description: string };

type ToolStrings = {
  // Shared
  title: string;
  titlePlaceholder: string;
  back: string;
  generating: string;
  workingOnIt: string;
  sourceInputPlaceholder: string;
  import: string;
  couldNotParse: string;
  questions: string;
  cards: string;
  length: string;
  short: string;
  medium: string;
  long: string;

  // Quiz
  quiz: {
    generate: string;
    generatingTitle: string;
    createQuiz: string;
    parseError: string;
    labels: {
      pack: string;
      mode: string;
      difficulty: string;
      questionType: string;
      feedback: string;
      gradingStrictness: string;
      spellingTolerance: string;
      partialCredit: string;
      gradingMethod: string;
    };
    modeOptions: OptionDef[];
    packOptions: OptionDef[];
    difficultyOptions: OptionDef[];
    questionTypeOptions: OptionDef[];
    feedbackOptions: OptionDef[];
    gradingStrictnessOptions: OptionDef[];
    spellingToleranceOptions: OptionDef[];
    partialCreditOptions: OptionDef[];
    gradingMethodOptions: OptionDef[];
  };

  // Flashcards
  flashcards: {
    generate: string;
    generatingTitle: string;
    createFlashcards: string;
    parseError: string;
    labels: {
      pack: string;
      studyMode: string;
      retention: string;
      cardStyle: string;
      complexity: string;
    };
    studyModeOptions: OptionDef[];
    packOptions: OptionDef[];
    retentionOptions: OptionDef[];
    cardStyleOptions: OptionDef[];
    complexityOptions: OptionDef[];
  };

  // Notes
  notes: {
    generate: string;
    generatingTitle: string;
    parseError: string;
    labels: {
      pack: string;
      style: string;
      focus: string;
      tone: string;
      audience: string;
    };
    packOptions: OptionDef[];
    styleOptions: OptionDef[];
    focusOptions: OptionDef[];
    toneOptions: OptionDef[];
    audienceOptions: OptionDef[];
  };
};

// ─── ENGLISH ───────────────────────────────────────────────
const en: ToolStrings = {
  title: 'Title',
  titlePlaceholder: 'e.g. Biology Ch3 Quiz',
  back: '← Back',
  generating: 'Generating',
  workingOnIt: 'Working on it...',
  sourceInputPlaceholder: 'Paste or type your source material...',
  import: 'Import',
  couldNotParse: 'Could not parse',
  questions: 'Questions',
  cards: 'Cards',
  length: 'Length',
  short: 'Short',
  medium: 'Medium',
  long: 'Long',

  quiz: {
    generate: 'Generate Quiz',
    generatingTitle: 'Generating Quiz',
    createQuiz: 'Create Quiz',
    parseError: 'The content could not be recognized as a quiz. Make sure it matches the export format.',
    labels: { pack: 'Pack', mode: 'Mode', difficulty: 'Difficulty', questionType: 'Question Type', feedback: 'Feedback', gradingStrictness: 'Grading Strictness', spellingTolerance: 'Spelling Tolerance', partialCredit: 'Partial Credit', gradingMethod: 'Grading Method' },
    modeOptions: [
      { value: 'practice', label: 'Chill', description: 'Relaxed mode with hints and explanations after each question' },
      { value: 'normal', label: 'Classic', description: 'Standard quiz with score at the end' },
      { value: 'exam', label: 'Exam Focus', description: 'Timed exam mode with stricter flow and limited hints' },
      { value: 'survival', label: 'Survival', description: 'Endless questions until you get one wrong' },
      { value: 'speedrun', label: 'Speedrun', description: 'Answer as many as possible in a time limit' },
      { value: 'adaptive', label: 'Smart', description: 'Difficulty adjusts based on your performance' },
      { value: 'boss-fight', label: 'Boss Fight', description: 'One extremely hard multi-part question' },
      { value: 'duel', label: 'Duel', description: 'Compete head-to-head against an AI opponent' },
      { value: 'blitz', label: 'Blitz', description: '5-second timer per question, pure speed' },
      { value: 'reverse', label: 'Reverse', description: 'Given the answer, figure out the question' },
      { value: 'elimination', label: 'Elimination', description: 'Wrong answers remove options until only correct remains' },
    ],
    packOptions: [
      { value: 'practice', label: 'Warm-Up', description: 'Lighter questions focused on understanding concepts' },
      { value: 'exam', label: 'Test-Ready', description: 'Rigorous questions matching real exam difficulty' },
      { value: 'adaptive', label: 'Mixed Bag', description: 'Mix of difficulties that adapts to your level' },
      { value: 'deep-dive', label: 'Deep Dive', description: 'Focuses on edge cases, exceptions, and nuance' },
      { value: 'rapid-review', label: 'Rapid Review', description: 'Quick-fire questions covering broad surface area' },
      { value: 'application', label: 'Real World', description: 'Scenario-based questions testing real-world usage' },
    ],
    difficultyOptions: [
      { value: 'balanced', label: 'Balanced', description: 'Even mix of easy, medium, and hard questions' },
      { value: 'ramp', label: 'Ramp', description: 'Starts easy and gradually gets harder' },
      { value: 'hard', label: 'Hard', description: 'All questions are challenging from the start' },
      { value: 'easy', label: 'Easy', description: 'Beginner-friendly questions for building confidence' },
      { value: 'random', label: 'Random', description: 'Completely random difficulty distribution' },
      { value: 'inverted', label: 'Inverted', description: 'Starts hard and gets easier — reverse ramp' },
    ],
    questionTypeOptions: [
      { value: 'mixed', label: 'Mixed', description: 'Combination of all question types' },
      { value: 'multiple-choice', label: 'Multiple Choice', description: 'Pick the correct answer from options' },
      { value: 'true-false', label: 'True/False', description: 'Simple true or false statements' },
      { value: 'fill-blank', label: 'Fill in Blank', description: 'Complete the missing word or phrase' },
      { value: 'short-answer', label: 'Short Answer', description: 'Write a brief response in your own words' },
      { value: 'matching', label: 'Matching', description: 'Match items from two columns together' },
      { value: 'ordering', label: 'Ordering', description: 'Put items in the correct sequence' },
    ],
    feedbackOptions: [
      { value: 'immediate', label: 'Immediate', description: 'See if you\'re right or wrong after each question' },
      { value: 'end', label: 'At End', description: 'Review all answers together when the quiz is done' },
      { value: 'detailed', label: 'Detailed', description: 'Full explanation with source references after each question' },
      { value: 'minimal', label: 'Minimal', description: 'Just correct/incorrect, no explanations' },
      { value: 'none', label: 'None', description: 'No feedback at all — score only' },
    ],
    gradingStrictnessOptions: [
      { value: 'exact', label: 'Exact', description: 'Answer must match exactly — no wiggle room at all' },
      { value: 'strict', label: 'Strict', description: 'Very close match required, minor phrasing differences allowed' },
      { value: 'moderate', label: 'Moderate', description: 'Accepts semantically correct answers with different wording' },
      { value: 'lenient', label: 'Lenient', description: 'Accepts any answer that demonstrates understanding' },
      { value: 'conceptual', label: 'Conceptual', description: 'Only checks if the core concept is correct, ignores details' },
    ],
    spellingToleranceOptions: [
      { value: 'none', label: 'No Tolerance', description: 'Spelling mistakes count as wrong answers' },
      { value: 'strict', label: 'Strict', description: 'Only allows 1 character difference' },
      { value: 'lenient', label: 'Lenient', description: 'Allows minor typos and common misspellings' },
      { value: 'ignore', label: 'Ignore Spelling', description: 'Spelling is completely ignored when grading' },
    ],
    partialCreditOptions: [
      { value: 'enabled', label: 'Enabled', description: 'Get partial points for partially correct answers' },
      { value: 'disabled', label: 'Disabled', description: 'All or nothing — no partial credit' },
      { value: 'generous', label: 'Generous', description: 'Awards credit for any relevant knowledge shown' },
      { value: 'weighted', label: 'Weighted', description: 'Partial credit scaled by how close the answer is' },
    ],
    gradingMethodOptions: [
      { value: 'auto', label: 'Auto', description: 'AI grades automatically based on your strictness settings' },
      { value: 'self', label: 'Self Grade', description: 'Grade yourself — compare your answer to the correct one' },
      { value: 'ai-review', label: 'AI Review', description: 'AI grades and provides detailed improvement suggestions' },
      { value: 'off', label: 'Off', description: 'No grading at all — just practice without scores' },
      { value: 'peer', label: 'Peer', description: 'Share answers for peer review and discussion' },
    ],
  },

  flashcards: {
    generate: 'Generate Flashcards',
    generatingTitle: 'Generating Flashcards',
    createFlashcards: 'Create Flashcards',
    parseError: 'The content could not be recognized as flashcards.',
    labels: { pack: 'Pack', studyMode: 'Mode', retention: 'Retention', cardStyle: 'Card Style', complexity: 'Complexity' },
    studyModeOptions: [
      { value: 'flip', label: 'Standard', description: 'Classic flip card mode' },
      { value: 'type', label: 'Type', description: 'Type your answer before revealing the correct one' },
      { value: 'multiple-choice', label: 'Multiple Choice', description: 'Choose the correct answer from 3 related options' },
    ],
    packOptions: [
      { value: 'core', label: 'Essentials', description: 'Essential terms and definitions from the material' },
      { value: 'retention', label: 'Memorize', description: 'Spaced-repetition optimized for long-term memory' },
      { value: 'exam', label: 'Test-Ready', description: 'Exam-style questions with tricky distractors' },
      { value: 'deep-dive', label: 'Deep Dive', description: 'Nuanced cards covering edge cases and details' },
      { value: 'quick-review', label: 'Quick Scan', description: 'High-level overview cards for fast revision' },
      { value: 'application', label: 'Real World', description: 'Apply concepts to real-world scenarios' },
      { value: 'connections', label: 'Connections', description: 'Cards linking related concepts across topics' },
    ],
    retentionOptions: [
      { value: 'balanced', label: 'Balanced', description: 'Standard repetition schedule for steady learning' },
      { value: 'aggressive', label: 'Aggressive', description: 'More repetitions, faster intervals for quick mastery' },
      { value: 'exam-cram', label: 'Exam Cram', description: 'Intense short-term memorization before an exam' },
      { value: 'long-term', label: 'Long Term', description: 'Extended intervals optimized for months-long retention' },
      { value: 'weak-focus', label: 'Weak Focus', description: 'Prioritizes cards you keep getting wrong' },
    ],
    cardStyleOptions: [
      { value: 'standard', label: 'Standard', description: 'Simple front/back question and answer format' },
      { value: 'cloze', label: 'Cloze', description: 'Fill-in-the-blank within a sentence or passage' },
      { value: 'image-occlusion', label: 'Image', description: 'Hide parts of diagrams or images to test recall' },
      { value: 'reversed', label: 'Reversed', description: 'Answer shown first — recall the question/term' },
      { value: 'context', label: 'Context', description: 'Includes surrounding context for better understanding' },
      { value: 'mnemonic', label: 'Mnemonic', description: 'Includes memory tricks and associations' },
    ],
    complexityOptions: [
      { value: 'simple', label: 'Simple', description: 'Single facts and definitions' },
      { value: 'medium', label: 'Medium', description: 'Concepts requiring some explanation' },
      { value: 'complex', label: 'Complex', description: 'Multi-layered ideas with connections' },
      { value: 'expert', label: 'Expert', description: 'Advanced material with synthesis required' },
    ],
  },

  notes: {
    generate: 'Generate Notes',
    generatingTitle: 'Generating Notes',
    parseError: 'The content could not be recognized as notes.',
    labels: { pack: 'Pack', style: 'Style', focus: 'Focus', tone: 'Tone', audience: 'Audience' },
    packOptions: [
      { value: 'core', label: 'Essentials', description: 'Key concepts and main ideas distilled clearly' },
      { value: 'exam', label: 'Test-Ready', description: 'Exam-focused notes with testable facts highlighted' },
      { value: 'reference', label: 'Full Reference', description: 'Comprehensive reference material with full detail' },
      { value: 'lecture', label: 'Lecture Flow', description: 'Follows the flow of a lecture with speaker cues' },
      { value: 'revision', label: 'Quick Scan', description: 'Ultra-condensed review summaries for quick revision' },
      { value: 'research', label: 'Academic', description: 'Academic-style notes with citations and evidence' },
    ],
    styleOptions: [
      { value: 'structured', label: 'Structured', description: 'Hierarchical headings with organized sections' },
      { value: 'standard', label: 'Standard', description: 'Clean paragraph-based notes' },
      { value: 'bullet-points', label: 'Cornell', description: 'Two-column Cornell format with cues and summaries' },
      { value: 'timeline', label: 'Timeline', description: 'Chronological sequence of events and developments' },
      { value: 'mindmap', label: 'Mindmap', description: 'Visual branching structure showing relationships' },
      { value: 'vocabulary', label: 'Vocabulary', description: 'Term-definition pairs organized by topic' },
      { value: 'outline', label: 'Outline', description: 'Numbered outline with indented sub-points' },
      { value: 'charting', label: 'Charting', description: 'Table-based comparison of categories and properties' },
      { value: 'flow', label: 'Flow', description: 'Step-by-step process notes for procedures and methods' },
      { value: 'q-and-a', label: 'Q&A', description: 'Question-and-answer pairs for self-testing' },
    ],
    focusOptions: [
      { value: 'clarity', label: 'Clarity', description: 'Prioritizes clear, easy-to-understand explanations' },
      { value: 'compression', label: 'Cram', description: 'Maximum information in minimum space' },
      { value: 'retention', label: 'Retention', description: 'Structured for long-term memory with repetition cues' },
      { value: 'understanding', label: 'Understanding', description: 'Deep explanations with examples and analogies' },
      { value: 'application', label: 'Application', description: 'Focuses on how to apply concepts practically' },
      { value: 'synthesis', label: 'Synthesis', description: 'Connects ideas across topics and finds patterns' },
    ],
    toneOptions: [
      { value: 'neutral', label: 'Neutral', description: 'Standard academic tone' },
      { value: 'casual', label: 'Casual', description: 'Friendly and approachable, like a study buddy' },
      { value: 'formal', label: 'Formal', description: 'Professional and precise academic language' },
      { value: 'simplified', label: 'Simplified', description: 'Plain language, avoids jargon where possible' },
      { value: 'technical', label: 'Technical', description: 'Uses full technical vocabulary without simplification' },
    ],
    audienceOptions: [
      { value: 'student', label: 'Student', description: 'Tailored for learners encountering material for the first time' },
      { value: 'advanced', label: 'Advanced', description: 'Assumes prior knowledge, skips basics' },
      { value: 'teacher', label: 'Teacher', description: 'Teaching-oriented with pedagogical notes' },
      { value: 'professional', label: 'Professional', description: 'Practical focus for workplace application' },
      { value: 'researcher', label: 'Researcher', description: 'Emphasizes methodology, evidence, and gaps' },
    ],
  },
};

// ─── DUTCH ─────────────────────────────────────────────────
const nl: ToolStrings = {
  title: 'Titel',
  titlePlaceholder: 'bijv. Biologie H3 Quiz',
  back: '← Terug',
  generating: 'Genereren',
  workingOnIt: 'Bezig...',
  sourceInputPlaceholder: 'Plak of typ je bronmateriaal...',
  import: 'Importeren',
  couldNotParse: 'Kon niet verwerken',
  questions: 'Vragen',
  cards: 'Kaarten',
  length: 'Lengte',
  short: 'Kort',
  medium: 'Gemiddeld',
  long: 'Lang',

  quiz: {
    generate: 'Quiz genereren',
    generatingTitle: 'Quiz genereren',
    createQuiz: 'Quiz maken',
    parseError: 'De inhoud kon niet worden herkend als quiz. Controleer of het overeenkomt met het exportformaat.',
    labels: { pack: 'Pakket', mode: 'Modus', difficulty: 'Moeilijkheid', questionType: 'Vraagtype', feedback: 'Feedback', gradingStrictness: 'Beoordelingsstrengheid', spellingTolerance: 'Spellingtolerantie', partialCredit: 'Deelpunten', gradingMethod: 'Beoordelingsmethode' },
    modeOptions: [
      { value: 'practice', label: 'Relaxed', description: 'Ontspannen modus met hints en uitleg na elke vraag' },
      { value: 'normal', label: 'Klassiek', description: 'Standaard quiz met score aan het einde' },
      { value: 'exam', label: 'Examen Focus', description: 'Getimede examenmodus met strakkere flow en beperkte hints' },
      { value: 'survival', label: 'Survival', description: 'Eindeloze vragen tot je er één fout hebt' },
      { value: 'speedrun', label: 'Speedrun', description: 'Beantwoord zoveel mogelijk binnen de tijdslimiet' },
      { value: 'adaptive', label: 'Slim', description: 'Moeilijkheid past zich aan op basis van je prestaties' },
      { value: 'boss-fight', label: 'Boss Fight', description: 'Eén extreem moeilijke meerdelige vraag' },
      { value: 'duel', label: 'Duel', description: 'Strijd tegen een AI-tegenstander' },
      { value: 'blitz', label: 'Blitz', description: '5 seconden per vraag, pure snelheid' },
      { value: 'reverse', label: 'Omgekeerd', description: 'Je krijgt het antwoord, bedenk de vraag' },
      { value: 'elimination', label: 'Eliminatie', description: 'Foute antwoorden verwijderen opties tot alleen het juiste overblijft' },
    ],
    packOptions: [
      { value: 'practice', label: 'Opwarming', description: 'Lichtere vragen gericht op begrip' },
      { value: 'exam', label: 'Toetsklaar', description: 'Strikte vragen op examenniveau' },
      { value: 'adaptive', label: 'Gemixte zak', description: 'Mix van moeilijkheden die zich aanpast' },
      { value: 'deep-dive', label: 'Diepgang', description: 'Richt zich op randgevallen en nuance' },
      { value: 'rapid-review', label: 'Snel overzicht', description: 'Snelle vragen over breed oppervlak' },
      { value: 'application', label: 'Praktijk', description: 'Scenariovragen voor praktijkgebruik' },
    ],
    difficultyOptions: [
      { value: 'balanced', label: 'Gebalanceerd', description: 'Gelijke mix van makkelijk, gemiddeld en moeilijk' },
      { value: 'ramp', label: 'Opbouwend', description: 'Begint makkelijk en wordt geleidelijk moeilijker' },
      { value: 'hard', label: 'Moeilijk', description: 'Alle vragen zijn uitdagend vanaf het begin' },
      { value: 'easy', label: 'Makkelijk', description: 'Beginnersvriendelijke vragen' },
      { value: 'random', label: 'Willekeurig', description: 'Volledig willekeurige moeilijkheidsverdeling' },
      { value: 'inverted', label: 'Omgekeerd', description: 'Begint moeilijk en wordt makkelijker' },
    ],
    questionTypeOptions: [
      { value: 'mixed', label: 'Gemengd', description: 'Combinatie van alle vraagtypes' },
      { value: 'multiple-choice', label: 'Meerkeuze', description: 'Kies het juiste antwoord uit opties' },
      { value: 'true-false', label: 'Waar/Onwaar', description: 'Eenvoudige waar of onwaar stellingen' },
      { value: 'fill-blank', label: 'Invullen', description: 'Vul het ontbrekende woord of zin aan' },
      { value: 'short-answer', label: 'Kort antwoord', description: 'Schrijf een kort antwoord in eigen woorden' },
      { value: 'matching', label: 'Koppelen', description: 'Koppel items uit twee kolommen' },
      { value: 'ordering', label: 'Volgorde', description: 'Zet items in de juiste volgorde' },
    ],
    feedbackOptions: [
      { value: 'immediate', label: 'Direct', description: 'Zie meteen of je goed of fout hebt' },
      { value: 'end', label: 'Aan het einde', description: 'Bekijk alle antwoorden samen na afloop' },
      { value: 'detailed', label: 'Gedetailleerd', description: 'Volledige uitleg met bronverwijzingen' },
      { value: 'minimal', label: 'Minimaal', description: 'Alleen goed/fout, geen uitleg' },
      { value: 'none', label: 'Geen', description: 'Helemaal geen feedback — alleen score' },
    ],
    gradingStrictnessOptions: [
      { value: 'exact', label: 'Exact', description: 'Antwoord moet exact overeenkomen' },
      { value: 'strict', label: 'Strikt', description: 'Zeer dicht bij het antwoord vereist' },
      { value: 'moderate', label: 'Gematigd', description: 'Accepteert semantisch correcte antwoorden' },
      { value: 'lenient', label: 'Soepel', description: 'Accepteert elk antwoord dat begrip toont' },
      { value: 'conceptual', label: 'Conceptueel', description: 'Controleert alleen of het kernconcept klopt' },
    ],
    spellingToleranceOptions: [
      { value: 'none', label: 'Geen tolerantie', description: 'Spelfouten tellen als foute antwoorden' },
      { value: 'strict', label: 'Strikt', description: 'Slechts 1 karakter verschil toegestaan' },
      { value: 'lenient', label: 'Soepel', description: 'Staat kleine typfouten toe' },
      { value: 'ignore', label: 'Negeer spelling', description: 'Spelling wordt volledig genegeerd' },
    ],
    partialCreditOptions: [
      { value: 'enabled', label: 'Aan', description: 'Krijg deelpunten voor gedeeltelijk juiste antwoorden' },
      { value: 'disabled', label: 'Uit', description: 'Alles of niets — geen deelpunten' },
      { value: 'generous', label: 'Ruimhartig', description: 'Punten voor elke relevante kennis' },
      { value: 'weighted', label: 'Gewogen', description: 'Deelpunten geschaald naar nauwkeurigheid' },
    ],
    gradingMethodOptions: [
      { value: 'auto', label: 'Automatisch', description: 'AI beoordeelt automatisch op basis van instellingen' },
      { value: 'self', label: 'Zelf beoordelen', description: 'Beoordeel jezelf — vergelijk met het juiste antwoord' },
      { value: 'ai-review', label: 'AI Review', description: 'AI beoordeelt en geeft verbeteringsuggesties' },
      { value: 'off', label: 'Uit', description: 'Geen beoordeling — alleen oefenen' },
      { value: 'peer', label: 'Peer', description: 'Deel antwoorden voor peer review' },
    ],
  },

  flashcards: {
    generate: 'Flashcards genereren',
    generatingTitle: 'Flashcards genereren',
    createFlashcards: 'Flashcards maken',
    parseError: 'De inhoud kon niet worden herkend als flashcards.',
    labels: { pack: 'Pakket', studyMode: 'Studiemodus', retention: 'Onthouden', cardStyle: 'Kaartstijl', complexity: 'Complexiteit' },
    studyModeOptions: [
      { value: 'flip', label: 'Standard', description: 'Classic flip card mode' },
      { value: 'type', label: 'Type', description: 'Type your answer before revealing the correct one' },
      { value: 'multiple-choice', label: 'Multiple Choice', description: 'Choose the correct answer from 3 related options' },
    ],
    packOptions: [
      { value: 'core', label: 'Basis', description: 'Essentiële termen en definities uit het materiaal' },
      { value: 'retention', label: 'Onthouden', description: 'Geoptimaliseerd voor langetermijngeheugen' },
      { value: 'exam', label: 'Toetsklaar', description: 'Examenstijl vragen met lastige afleiders' },
      { value: 'deep-dive', label: 'Diepgang', description: 'Genuanceerde kaarten over randgevallen' },
      { value: 'quick-review', label: 'Snelle scan', description: 'Overzichtskaarten voor snelle herhaling' },
      { value: 'application', label: 'Praktijk', description: 'Pas concepten toe in de praktijk' },
      { value: 'connections', label: 'Verbindingen', description: 'Kaarten die gerelateerde concepten verbinden' },
    ],
    retentionOptions: [
      { value: 'balanced', label: 'Gebalanceerd', description: 'Standaard herhalingsschema' },
      { value: 'aggressive', label: 'Intensief', description: 'Meer herhalingen, snellere intervallen' },
      { value: 'exam-cram', label: 'Examenstress', description: 'Intensieve kortetermijnmemoratie' },
      { value: 'long-term', label: 'Lange termijn', description: 'Verlengde intervallen voor maanden retentie' },
      { value: 'weak-focus', label: 'Zwakke punten', description: 'Prioriteert kaarten die je fout blijft hebben' },
    ],
    cardStyleOptions: [
      { value: 'standard', label: 'Standaard', description: 'Eenvoudig voor/achter vraag-en-antwoord formaat' },
      { value: 'cloze', label: 'Cloze', description: 'Invullen binnen een zin of passage' },
      { value: 'image-occlusion', label: 'Afbeelding', description: 'Verberg delen van diagrammen om recall te testen' },
      { value: 'reversed', label: 'Omgekeerd', description: 'Antwoord eerst — herinner de vraag/term' },
      { value: 'context', label: 'Context', description: 'Inclusief omringende context voor beter begrip' },
      { value: 'mnemonic', label: 'Geheugensteun', description: 'Inclusief geheugentrucjes en associaties' },
    ],
    complexityOptions: [
      { value: 'simple', label: 'Simpel', description: 'Enkele feiten en definities' },
      { value: 'medium', label: 'Gemiddeld', description: 'Concepten die enige uitleg vereisen' },
      { value: 'complex', label: 'Complex', description: 'Meerlagige ideeën met verbindingen' },
      { value: 'expert', label: 'Expert', description: 'Gevorderd materiaal met synthese vereist' },
    ],
  },

  notes: {
    generate: 'Notities genereren',
    generatingTitle: 'Notities genereren',
    parseError: 'De inhoud kon niet worden herkend als notities.',
    labels: { pack: 'Pakket', style: 'Stijl', focus: 'Focus', tone: 'Toon', audience: 'Publiek' },
    packOptions: [
      { value: 'core', label: 'Basis', description: 'Kernconcepten en hoofdideeën helder samengevat' },
      { value: 'exam', label: 'Toetsklaar', description: 'Examengericht met toetsbare feiten' },
      { value: 'reference', label: 'Naslagwerk', description: 'Uitgebreid referentiemateriaal' },
      { value: 'lecture', label: 'College', description: 'Volgt de flow van een college' },
      { value: 'revision', label: 'Snelle scan', description: 'Ultra-beknopte samenvattingen' },
      { value: 'research', label: 'Academisch', description: 'Academische stijl met bronnen' },
    ],
    styleOptions: [
      { value: 'structured', label: 'Gestructureerd', description: 'Hiërarchische koppen met georganiseerde secties' },
      { value: 'standard', label: 'Standaard', description: 'Schone notities op basis van alinea\'s' },
      { value: 'bullet-points', label: 'Cornell', description: 'Twee-kolommen Cornell formaat' },
      { value: 'timeline', label: 'Tijdlijn', description: 'Chronologische volgorde van gebeurtenissen' },
      { value: 'mindmap', label: 'Mindmap', description: 'Visuele vertakkingsstructuur' },
      { value: 'vocabulary', label: 'Woordenlijst', description: 'Term-definitie paren per onderwerp' },
      { value: 'outline', label: 'Outline', description: 'Genummerde outline met subpunten' },
      { value: 'charting', label: 'Tabel', description: 'Tabelmatige vergelijking van categorieën' },
      { value: 'flow', label: 'Flow', description: 'Stapsgewijze procesnotities' },
      { value: 'q-and-a', label: 'V&A', description: 'Vraag-en-antwoord paren voor zelftest' },
    ],
    focusOptions: [
      { value: 'clarity', label: 'Helderheid', description: 'Prioriteert duidelijke uitleg' },
      { value: 'compression', label: 'Stampen', description: 'Maximale informatie in minimale ruimte' },
      { value: 'retention', label: 'Onthouden', description: 'Gestructureerd voor langetermijngeheugen' },
      { value: 'understanding', label: 'Begrip', description: 'Diepe uitleg met voorbeelden en analogieën' },
      { value: 'application', label: 'Toepassing', description: 'Richt zich op praktische toepassing' },
      { value: 'synthesis', label: 'Synthese', description: 'Verbindt ideeën en vindt patronen' },
    ],
    toneOptions: [
      { value: 'neutral', label: 'Neutraal', description: 'Standaard academische toon' },
      { value: 'casual', label: 'Informeel', description: 'Vriendelijk en benaderbaar' },
      { value: 'formal', label: 'Formeel', description: 'Professioneel en precies taalgebruik' },
      { value: 'simplified', label: 'Vereenvoudigd', description: 'Eenvoudige taal, vermijdt jargon' },
      { value: 'technical', label: 'Technisch', description: 'Volledige technische woordenschat' },
    ],
    audienceOptions: [
      { value: 'student', label: 'Student', description: 'Afgestemd op lerenden die materiaal voor het eerst tegenkomen' },
      { value: 'advanced', label: 'Gevorderd', description: 'Gaat uit van voorkennis, slaat basis over' },
      { value: 'teacher', label: 'Docent', description: 'Onderwijsgericht met pedagogische notities' },
      { value: 'professional', label: 'Professioneel', description: 'Praktische focus voor werktoepassing' },
      { value: 'researcher', label: 'Onderzoeker', description: 'Benadrukt methodologie en bewijs' },
    ],
  },
};

// ─── GERMAN ────────────────────────────────────────────────
const de: ToolStrings = {
  title: 'Titel',
  titlePlaceholder: 'z.B. Biologie Kap.3 Quiz',
  back: '← Zurück',
  generating: 'Generieren',
  workingOnIt: 'Wird bearbeitet...',
  sourceInputPlaceholder: 'Quellmaterial einfügen oder eingeben...',
  import: 'Importieren',
  couldNotParse: 'Konnte nicht verarbeitet werden',
  questions: 'Fragen',
  cards: 'Karten',
  length: 'Länge',
  short: 'Kurz',
  medium: 'Mittel',
  long: 'Lang',

  quiz: {
    generate: 'Quiz generieren',
    generatingTitle: 'Quiz wird generiert',
    createQuiz: 'Quiz erstellen',
    parseError: 'Der Inhalt konnte nicht als Quiz erkannt werden.',
    labels: { pack: 'Paket', mode: 'Modus', difficulty: 'Schwierigkeit', questionType: 'Fragetyp', feedback: 'Feedback', gradingStrictness: 'Bewertungsstrenge', spellingTolerance: 'Rechtschreibtoleranz', partialCredit: 'Teilpunkte', gradingMethod: 'Bewertungsmethode' },
    modeOptions: [
      { value: 'practice', label: 'Locker', description: 'Entspannter Modus mit Hinweisen und Erklärungen' },
      { value: 'normal', label: 'Klassisch', description: 'Standard-Quiz mit Punktzahl am Ende' },
      { value: 'exam', label: 'Lockdown', description: 'Strenge Zeitprüfung — kein Zurück, keine Hinweise' },
      { value: 'survival', label: 'Survival', description: 'Endlose Fragen bis zur ersten falschen Antwort' },
      { value: 'speedrun', label: 'Speedrun', description: 'So viele Antworten wie möglich im Zeitlimit' },
      { value: 'adaptive', label: 'Smart', description: 'Schwierigkeit passt sich deiner Leistung an' },
      { value: 'boss-fight', label: 'Boss Fight', description: 'Eine extrem schwere mehrteilige Frage' },
      { value: 'duel', label: 'Duell', description: 'Tritt gegen einen KI-Gegner an' },
      { value: 'blitz', label: 'Blitz', description: '5-Sekunden-Timer pro Frage' },
      { value: 'reverse', label: 'Umgekehrt', description: 'Die Antwort ist gegeben, finde die Frage' },
      { value: 'elimination', label: 'Elimination', description: 'Falsche Antworten entfernen Optionen' },
    ],
    packOptions: [
      { value: 'practice', label: 'Aufwärmen', description: 'Leichtere Fragen zum Verständnis' },
      { value: 'exam', label: 'Prüfungsreif', description: 'Strenge Fragen auf Prüfungsniveau' },
      { value: 'adaptive', label: 'Bunt gemischt', description: 'Mix aus Schwierigkeiten, der sich anpasst' },
      { value: 'deep-dive', label: 'Tiefgang', description: 'Fokussiert auf Randfälle und Nuancen' },
      { value: 'rapid-review', label: 'Schnellüberblick', description: 'Schnelle Fragen über breite Themen' },
      { value: 'application', label: 'Praxis', description: 'Szenariobasierte Praxisfragen' },
    ],
    difficultyOptions: [
      { value: 'balanced', label: 'Ausgewogen', description: 'Gleiche Mischung aus leicht, mittel und schwer' },
      { value: 'ramp', label: 'Ansteigend', description: 'Beginnt leicht und wird schwerer' },
      { value: 'hard', label: 'Schwer', description: 'Alle Fragen sind von Anfang an anspruchsvoll' },
      { value: 'easy', label: 'Leicht', description: 'Anfängerfreundliche Fragen' },
      { value: 'random', label: 'Zufällig', description: 'Völlig zufällige Schwierigkeitsverteilung' },
      { value: 'inverted', label: 'Umgekehrt', description: 'Beginnt schwer und wird leichter' },
    ],
    questionTypeOptions: [
      { value: 'mixed', label: 'Gemischt', description: 'Kombination aller Fragetypen' },
      { value: 'multiple-choice', label: 'Multiple Choice', description: 'Wähle die richtige Antwort' },
      { value: 'true-false', label: 'Wahr/Falsch', description: 'Einfache Wahr-oder-Falsch-Aussagen' },
      { value: 'fill-blank', label: 'Lückentext', description: 'Vervollständige das fehlende Wort' },
      { value: 'short-answer', label: 'Kurzantwort', description: 'Schreibe eine kurze Antwort' },
      { value: 'matching', label: 'Zuordnung', description: 'Ordne Elemente aus zwei Spalten zu' },
      { value: 'ordering', label: 'Reihenfolge', description: 'Bringe Elemente in die richtige Reihenfolge' },
    ],
    feedbackOptions: [
      { value: 'immediate', label: 'Sofort', description: 'Sieh nach jeder Frage, ob du richtig liegst' },
      { value: 'end', label: 'Am Ende', description: 'Alle Antworten am Ende zusammen überprüfen' },
      { value: 'detailed', label: 'Detailliert', description: 'Ausführliche Erklärung mit Quellenangaben' },
      { value: 'minimal', label: 'Minimal', description: 'Nur richtig/falsch, keine Erklärungen' },
      { value: 'none', label: 'Keine', description: 'Kein Feedback — nur Punktzahl' },
    ],
    gradingStrictnessOptions: [
      { value: 'exact', label: 'Exakt', description: 'Antwort muss exakt übereinstimmen' },
      { value: 'strict', label: 'Streng', description: 'Sehr nahe Übereinstimmung erforderlich' },
      { value: 'moderate', label: 'Moderat', description: 'Akzeptiert semantisch korrekte Antworten' },
      { value: 'lenient', label: 'Nachsichtig', description: 'Akzeptiert Antworten, die Verständnis zeigen' },
      { value: 'conceptual', label: 'Konzeptuell', description: 'Prüft nur ob das Kernkonzept stimmt' },
    ],
    spellingToleranceOptions: [
      { value: 'none', label: 'Keine Toleranz', description: 'Rechtschreibfehler zählen als falsch' },
      { value: 'strict', label: 'Streng', description: 'Nur 1 Zeichenunterschied erlaubt' },
      { value: 'lenient', label: 'Nachsichtig', description: 'Erlaubt kleine Tippfehler' },
      { value: 'ignore', label: 'Ignorieren', description: 'Rechtschreibung wird komplett ignoriert' },
    ],
    partialCreditOptions: [
      { value: 'enabled', label: 'Aktiviert', description: 'Teilpunkte für teilweise richtige Antworten' },
      { value: 'disabled', label: 'Deaktiviert', description: 'Alles oder nichts — keine Teilpunkte' },
      { value: 'generous', label: 'Großzügig', description: 'Punkte für jedes relevante Wissen' },
      { value: 'weighted', label: 'Gewichtet', description: 'Teilpunkte je nach Genauigkeit skaliert' },
    ],
    gradingMethodOptions: [
      { value: 'auto', label: 'Automatisch', description: 'KI bewertet automatisch' },
      { value: 'self', label: 'Selbstbewertung', description: 'Bewerte dich selbst — vergleiche mit der Lösung' },
      { value: 'ai-review', label: 'KI-Review', description: 'KI bewertet und gibt Verbesserungsvorschläge' },
      { value: 'off', label: 'Aus', description: 'Keine Bewertung — nur Übung' },
      { value: 'peer', label: 'Peer', description: 'Teile Antworten für Peer-Review' },
    ],
  },

  flashcards: {
    generate: 'Karteikarten generieren',
    generatingTitle: 'Karteikarten generieren',
    createFlashcards: 'Karteikarten erstellen',
    parseError: 'Inhalt konnte nicht als Karteikarten erkannt werden.',
    labels: { pack: 'Paket', studyMode: 'Lernmodus', retention: 'Behalten', cardStyle: 'Kartenstil', complexity: 'Komplexität' },
    studyModeOptions: [
      { value: 'flip', label: 'Standard', description: 'Classic flip card mode' },
      { value: 'type', label: 'Type', description: 'Type your answer before revealing the correct one' },
      { value: 'multiple-choice', label: 'Multiple Choice', description: 'Choose the correct answer from 3 related options' },
    ],
    packOptions: [
      { value: 'core', label: 'Grundlagen', description: 'Wesentliche Begriffe und Definitionen' },
      { value: 'retention', label: 'Merken', description: 'Optimiert für Langzeitgedächtnis' },
      { value: 'exam', label: 'Prüfungsreif', description: 'Prüfungsfragen mit kniffligen Ablenkungen' },
      { value: 'deep-dive', label: 'Tiefgang', description: 'Nuancierte Karten über Randfälle' },
      { value: 'quick-review', label: 'Schnellscan', description: 'Übersichtskarten für schnelle Wiederholung' },
      { value: 'application', label: 'Praxis', description: 'Konzepte in der Praxis anwenden' },
      { value: 'connections', label: 'Verbindungen', description: 'Karten, die verwandte Konzepte verknüpfen' },
    ],
    retentionOptions: [
      { value: 'balanced', label: 'Ausgewogen', description: 'Standard-Wiederholungsplan' },
      { value: 'aggressive', label: 'Intensiv', description: 'Mehr Wiederholungen, kürzere Abstände' },
      { value: 'exam-cram', label: 'Prüfungsstress', description: 'Intensive Kurzzeitmemorierung' },
      { value: 'long-term', label: 'Langfristig', description: 'Längere Abstände für monatelanges Behalten' },
      { value: 'weak-focus', label: 'Schwächen', description: 'Priorisiert Karten, die du falsch hast' },
    ],
    cardStyleOptions: [
      { value: 'standard', label: 'Standard', description: 'Einfaches Frage-Antwort-Format' },
      { value: 'cloze', label: 'Lückentext', description: 'Ausfüllen innerhalb eines Satzes' },
      { value: 'image-occlusion', label: 'Bild', description: 'Teile von Diagrammen verbergen' },
      { value: 'reversed', label: 'Umgekehrt', description: 'Antwort zuerst — erinnere die Frage' },
      { value: 'context', label: 'Kontext', description: 'Mit umgebendem Kontext für besseres Verständnis' },
      { value: 'mnemonic', label: 'Eselsbrücke', description: 'Mit Gedächtnistricks und Assoziationen' },
    ],
    complexityOptions: [
      { value: 'simple', label: 'Einfach', description: 'Einzelne Fakten und Definitionen' },
      { value: 'medium', label: 'Mittel', description: 'Konzepte mit etwas Erklärung' },
      { value: 'complex', label: 'Komplex', description: 'Mehrschichtige Ideen mit Verbindungen' },
      { value: 'expert', label: 'Experte', description: 'Fortgeschrittenes Material mit Synthese' },
    ],
  },

  notes: {
    generate: 'Notizen generieren',
    generatingTitle: 'Notizen generieren',
    parseError: 'Inhalt konnte nicht als Notizen erkannt werden.',
    labels: { pack: 'Paket', style: 'Stil', focus: 'Fokus', tone: 'Ton', audience: 'Zielgruppe' },
    packOptions: [
      { value: 'core', label: 'Grundlagen', description: 'Kernkonzepte und Hauptideen klar destilliert' },
      { value: 'exam', label: 'Prüfungsreif', description: 'Prüfungsfokussiert mit prüfbaren Fakten' },
      { value: 'reference', label: 'Nachschlagewerk', description: 'Umfassendes Referenzmaterial' },
      { value: 'lecture', label: 'Vorlesung', description: 'Folgt dem Ablauf einer Vorlesung' },
      { value: 'revision', label: 'Schnellscan', description: 'Ultra-kompakte Zusammenfassungen' },
      { value: 'research', label: 'Akademisch', description: 'Akademischer Stil mit Quellenangaben' },
    ],
    styleOptions: [
      { value: 'structured', label: 'Strukturiert', description: 'Hierarchische Überschriften mit organisierten Abschnitten' },
      { value: 'standard', label: 'Standard', description: 'Saubere absatzbasierte Notizen' },
      { value: 'bullet-points', label: 'Cornell', description: 'Zwei-Spalten-Cornell-Format' },
      { value: 'timeline', label: 'Zeitstrahl', description: 'Chronologische Reihenfolge von Ereignissen' },
      { value: 'mindmap', label: 'Mindmap', description: 'Visuelle Verzweigungsstruktur' },
      { value: 'vocabulary', label: 'Vokabeln', description: 'Begriff-Definition-Paare nach Thema' },
      { value: 'outline', label: 'Gliederung', description: 'Nummerierte Gliederung mit Unterpunkten' },
      { value: 'charting', label: 'Tabelle', description: 'Tabellarischer Vergleich von Kategorien' },
      { value: 'flow', label: 'Ablauf', description: 'Schrittweise Prozessnotizen' },
      { value: 'q-and-a', label: 'F&A', description: 'Frage-Antwort-Paare zum Selbsttest' },
    ],
    focusOptions: [
      { value: 'clarity', label: 'Klarheit', description: 'Priorisiert klare, verständliche Erklärungen' },
      { value: 'compression', label: 'Pauken', description: 'Maximale Information auf minimalem Raum' },
      { value: 'retention', label: 'Behalten', description: 'Strukturiert für Langzeitgedächtnis' },
      { value: 'understanding', label: 'Verständnis', description: 'Tiefe Erklärungen mit Beispielen' },
      { value: 'application', label: 'Anwendung', description: 'Fokus auf praktische Anwendung' },
      { value: 'synthesis', label: 'Synthese', description: 'Verbindet Ideen und findet Muster' },
    ],
    toneOptions: [
      { value: 'neutral', label: 'Neutral', description: 'Akademischer Standardton' },
      { value: 'casual', label: 'Locker', description: 'Freundlich und zugänglich' },
      { value: 'formal', label: 'Formell', description: 'Professionelle, präzise Sprache' },
      { value: 'simplified', label: 'Vereinfacht', description: 'Einfache Sprache, vermeidet Fachjargon' },
      { value: 'technical', label: 'Technisch', description: 'Volle Fachterminologie ohne Vereinfachung' },
    ],
    audienceOptions: [
      { value: 'student', label: 'Schüler', description: 'Für Lernende beim ersten Kontakt mit dem Material' },
      { value: 'advanced', label: 'Fortgeschritten', description: 'Setzt Vorwissen voraus, überspringt Basics' },
      { value: 'teacher', label: 'Lehrer', description: 'Unterrichtsorientiert mit pädagogischen Hinweisen' },
      { value: 'professional', label: 'Professionell', description: 'Praxisfokus für berufliche Anwendung' },
      { value: 'researcher', label: 'Forscher', description: 'Betont Methodik, Evidenz und Lücken' },
    ],
  },
};

// ─── FRENCH ────────────────────────────────────────────────
const fr: ToolStrings = {
  title: 'Titre',
  titlePlaceholder: 'ex. Biologie Ch3 Quiz',
  back: '← Retour',
  generating: 'Génération',
  workingOnIt: 'En cours...',
  sourceInputPlaceholder: 'Collez ou saisissez votre matériel source...',
  import: 'Importer',
  couldNotParse: 'Impossible à analyser',
  questions: 'Questions',
  cards: 'Cartes',
  length: 'Longueur',
  short: 'Court',
  medium: 'Moyen',
  long: 'Long',

  quiz: {
    generate: 'Générer le quiz',
    generatingTitle: 'Génération du quiz',
    createQuiz: 'Créer un quiz',
    parseError: 'Le contenu n\'a pas pu être reconnu comme un quiz.',
    labels: { pack: 'Pack', mode: 'Mode', difficulty: 'Difficulté', questionType: 'Type de question', feedback: 'Retour', gradingStrictness: 'Rigueur de notation', spellingTolerance: 'Tolérance orthographe', partialCredit: 'Crédit partiel', gradingMethod: 'Méthode de notation' },
    modeOptions: [
      { value: 'practice', label: 'Détendu', description: 'Mode relaxé avec indices et explications après chaque question' },
      { value: 'normal', label: 'Classique', description: 'Quiz standard avec score à la fin' },
      { value: 'exam', label: 'Lockdown', description: 'Examen chronométré strict — pas de retour, pas d\'indices' },
      { value: 'survival', label: 'Survie', description: 'Questions sans fin jusqu\'à une erreur' },
      { value: 'speedrun', label: 'Speedrun', description: 'Répondez au maximum dans le temps imparti' },
      { value: 'adaptive', label: 'Intelligent', description: 'La difficulté s\'adapte à vos performances' },
      { value: 'boss-fight', label: 'Boss Fight', description: 'Une question extrêmement difficile en plusieurs parties' },
      { value: 'duel', label: 'Duel', description: 'Affrontez un adversaire IA' },
      { value: 'blitz', label: 'Blitz', description: '5 secondes par question, pure vitesse' },
      { value: 'reverse', label: 'Inversé', description: 'La réponse est donnée, trouvez la question' },
      { value: 'elimination', label: 'Élimination', description: 'Les mauvaises réponses éliminent des options' },
    ],
    packOptions: [
      { value: 'practice', label: 'Échauffement', description: 'Questions légères axées sur la compréhension' },
      { value: 'exam', label: 'Prêt pour l\'examen', description: 'Questions rigoureuses au niveau d\'examen' },
      { value: 'adaptive', label: 'Mélange', description: 'Mix de difficultés qui s\'adapte à votre niveau' },
      { value: 'deep-dive', label: 'Approfondissement', description: 'Cas limites, exceptions et nuances' },
      { value: 'rapid-review', label: 'Révision rapide', description: 'Questions rapides couvrant un large spectre' },
      { value: 'application', label: 'Monde réel', description: 'Questions basées sur des scénarios réels' },
    ],
    difficultyOptions: [
      { value: 'balanced', label: 'Équilibré', description: 'Mélange égal de questions faciles, moyennes et difficiles' },
      { value: 'ramp', label: 'Progressif', description: 'Commence facile et devient plus difficile' },
      { value: 'hard', label: 'Difficile', description: 'Toutes les questions sont exigeantes dès le début' },
      { value: 'easy', label: 'Facile', description: 'Questions pour débutants' },
      { value: 'random', label: 'Aléatoire', description: 'Distribution de difficulté complètement aléatoire' },
      { value: 'inverted', label: 'Inversé', description: 'Commence difficile et devient plus facile' },
    ],
    questionTypeOptions: [
      { value: 'mixed', label: 'Mixte', description: 'Combinaison de tous les types de questions' },
      { value: 'multiple-choice', label: 'Choix multiple', description: 'Choisir la bonne réponse parmi les options' },
      { value: 'true-false', label: 'Vrai/Faux', description: 'Énoncés simples vrai ou faux' },
      { value: 'fill-blank', label: 'Texte à trous', description: 'Compléter le mot ou la phrase manquante' },
      { value: 'short-answer', label: 'Réponse courte', description: 'Écrire une brève réponse personnelle' },
      { value: 'matching', label: 'Association', description: 'Associer les éléments de deux colonnes' },
      { value: 'ordering', label: 'Classement', description: 'Mettre les éléments dans le bon ordre' },
    ],
    feedbackOptions: [
      { value: 'immediate', label: 'Immédiat', description: 'Voir si c\'est correct après chaque question' },
      { value: 'end', label: 'À la fin', description: 'Revoir toutes les réponses à la fin' },
      { value: 'detailed', label: 'Détaillé', description: 'Explication complète avec références' },
      { value: 'minimal', label: 'Minimal', description: 'Juste correct/incorrect, pas d\'explications' },
      { value: 'none', label: 'Aucun', description: 'Pas de retour — score uniquement' },
    ],
    gradingStrictnessOptions: [
      { value: 'exact', label: 'Exact', description: 'La réponse doit correspondre exactement' },
      { value: 'strict', label: 'Strict', description: 'Correspondance très proche requise' },
      { value: 'moderate', label: 'Modéré', description: 'Accepte les réponses sémantiquement correctes' },
      { value: 'lenient', label: 'Indulgent', description: 'Accepte toute réponse montrant la compréhension' },
      { value: 'conceptual', label: 'Conceptuel', description: 'Vérifie uniquement le concept principal' },
    ],
    spellingToleranceOptions: [
      { value: 'none', label: 'Aucune tolérance', description: 'Les fautes d\'orthographe comptent comme erreurs' },
      { value: 'strict', label: 'Strict', description: 'Seulement 1 caractère de différence autorisé' },
      { value: 'lenient', label: 'Indulgent', description: 'Permet les petites fautes de frappe' },
      { value: 'ignore', label: 'Ignorer', description: 'L\'orthographe est complètement ignorée' },
    ],
    partialCreditOptions: [
      { value: 'enabled', label: 'Activé', description: 'Points partiels pour réponses partiellement correctes' },
      { value: 'disabled', label: 'Désactivé', description: 'Tout ou rien — pas de crédit partiel' },
      { value: 'generous', label: 'Généreux', description: 'Crédite toute connaissance pertinente' },
      { value: 'weighted', label: 'Pondéré', description: 'Crédit partiel proportionnel à la justesse' },
    ],
    gradingMethodOptions: [
      { value: 'auto', label: 'Auto', description: 'L\'IA note automatiquement' },
      { value: 'self', label: 'Auto-évaluation', description: 'Évaluez-vous — comparez avec la bonne réponse' },
      { value: 'ai-review', label: 'Revue IA', description: 'L\'IA note et donne des suggestions d\'amélioration' },
      { value: 'off', label: 'Désactivé', description: 'Pas de notation — juste de la pratique' },
      { value: 'peer', label: 'Pair', description: 'Partagez les réponses pour la revue par les pairs' },
    ],
  },

  flashcards: {
    generate: 'Générer les flashcards',
    generatingTitle: 'Génération des flashcards',
    createFlashcards: 'Créer des flashcards',
    parseError: 'Le contenu n\'a pas pu être reconnu comme des flashcards.',
    labels: { pack: 'Pack', studyMode: 'Mode d\'étude', retention: 'Rétention', cardStyle: 'Style de carte', complexity: 'Complexité' },
    studyModeOptions: [
      { value: 'flip', label: 'Standard', description: 'Classic flip card mode' },
      { value: 'type', label: 'Type', description: 'Type your answer before revealing the correct one' },
      { value: 'multiple-choice', label: 'Multiple Choice', description: 'Choose the correct answer from 3 related options' },
    ],
    packOptions: [
      { value: 'core', label: 'Essentiels', description: 'Termes et définitions essentiels du matériel' },
      { value: 'retention', label: 'Mémoriser', description: 'Optimisé pour la mémoire à long terme' },
      { value: 'exam', label: 'Prêt pour l\'examen', description: 'Questions d\'examen avec pièges' },
      { value: 'deep-dive', label: 'Approfondissement', description: 'Cartes nuancées sur les cas limites' },
      { value: 'quick-review', label: 'Scan rapide', description: 'Cartes d\'aperçu pour révision rapide' },
      { value: 'application', label: 'Monde réel', description: 'Appliquer les concepts à des scénarios réels' },
      { value: 'connections', label: 'Connexions', description: 'Cartes reliant des concepts liés' },
    ],
    retentionOptions: [
      { value: 'balanced', label: 'Équilibré', description: 'Calendrier de répétition standard' },
      { value: 'aggressive', label: 'Intensif', description: 'Plus de répétitions, intervalles plus courts' },
      { value: 'exam-cram', label: 'Bachotage', description: 'Mémorisation intensive à court terme' },
      { value: 'long-term', label: 'Long terme', description: 'Intervalles prolongés pour rétention durable' },
      { value: 'weak-focus', label: 'Points faibles', description: 'Priorise les cartes souvent ratées' },
    ],
    cardStyleOptions: [
      { value: 'standard', label: 'Standard', description: 'Format simple recto/verso' },
      { value: 'cloze', label: 'Texte à trous', description: 'Compléter dans une phrase ou un passage' },
      { value: 'image-occlusion', label: 'Image', description: 'Cacher des parties de diagrammes' },
      { value: 'reversed', label: 'Inversé', description: 'Réponse d\'abord — retrouver la question' },
      { value: 'context', label: 'Contexte', description: 'Avec contexte environnant pour mieux comprendre' },
      { value: 'mnemonic', label: 'Mnémonique', description: 'Avec astuces et associations mémorielles' },
    ],
    complexityOptions: [
      { value: 'simple', label: 'Simple', description: 'Faits et définitions uniques' },
      { value: 'medium', label: 'Moyen', description: 'Concepts nécessitant quelques explications' },
      { value: 'complex', label: 'Complexe', description: 'Idées multicouches avec connexions' },
      { value: 'expert', label: 'Expert', description: 'Matériel avancé nécessitant une synthèse' },
    ],
  },

  notes: {
    generate: 'Générer les notes',
    generatingTitle: 'Génération des notes',
    parseError: 'Le contenu n\'a pas pu être reconnu comme des notes.',
    labels: { pack: 'Pack', style: 'Style', focus: 'Focus', tone: 'Ton', audience: 'Public' },
    packOptions: [
      { value: 'core', label: 'Essentiels', description: 'Concepts clés et idées principales clairement résumés' },
      { value: 'exam', label: 'Prêt pour l\'examen', description: 'Notes axées examen avec faits testables' },
      { value: 'reference', label: 'Référence complète', description: 'Matériel de référence complet et détaillé' },
      { value: 'lecture', label: 'Cours', description: 'Suit le déroulement d\'un cours magistral' },
      { value: 'revision', label: 'Scan rapide', description: 'Résumés ultra-condensés pour révision rapide' },
      { value: 'research', label: 'Académique', description: 'Style académique avec citations et preuves' },
    ],
    styleOptions: [
      { value: 'structured', label: 'Structuré', description: 'Titres hiérarchiques avec sections organisées' },
      { value: 'standard', label: 'Standard', description: 'Notes basées sur des paragraphes' },
      { value: 'bullet-points', label: 'Cornell', description: 'Format Cornell à deux colonnes' },
      { value: 'timeline', label: 'Chronologie', description: 'Séquence chronologique des événements' },
      { value: 'mindmap', label: 'Carte mentale', description: 'Structure visuelle ramifiée' },
      { value: 'vocabulary', label: 'Vocabulaire', description: 'Paires terme-définition par sujet' },
      { value: 'outline', label: 'Plan', description: 'Plan numéroté avec sous-points' },
      { value: 'charting', label: 'Tableau', description: 'Comparaison tabulaire de catégories' },
      { value: 'flow', label: 'Flux', description: 'Notes de processus étape par étape' },
      { value: 'q-and-a', label: 'Q&R', description: 'Paires question-réponse pour l\'auto-test' },
    ],
    focusOptions: [
      { value: 'clarity', label: 'Clarté', description: 'Priorise des explications claires et compréhensibles' },
      { value: 'compression', label: 'Bachotage', description: 'Maximum d\'information en minimum d\'espace' },
      { value: 'retention', label: 'Rétention', description: 'Structuré pour la mémoire à long terme' },
      { value: 'understanding', label: 'Compréhension', description: 'Explications profondes avec exemples et analogies' },
      { value: 'application', label: 'Application', description: 'Comment appliquer les concepts en pratique' },
      { value: 'synthesis', label: 'Synthèse', description: 'Relie les idées entre sujets et trouve des patterns' },
    ],
    toneOptions: [
      { value: 'neutral', label: 'Neutre', description: 'Ton académique standard' },
      { value: 'casual', label: 'Décontracté', description: 'Amical et accessible, comme un camarade d\'étude' },
      { value: 'formal', label: 'Formel', description: 'Langage académique professionnel et précis' },
      { value: 'simplified', label: 'Simplifié', description: 'Langage simple, évite le jargon' },
      { value: 'technical', label: 'Technique', description: 'Vocabulaire technique complet sans simplification' },
    ],
    audienceOptions: [
      { value: 'student', label: 'Étudiant', description: 'Pour les apprenants découvrant le matériel' },
      { value: 'advanced', label: 'Avancé', description: 'Suppose des connaissances préalables' },
      { value: 'teacher', label: 'Enseignant', description: 'Orienté enseignement avec notes pédagogiques' },
      { value: 'professional', label: 'Professionnel', description: 'Focus pratique pour application professionnelle' },
      { value: 'researcher', label: 'Chercheur', description: 'Met l\'accent sur la méthodologie et les preuves' },
    ],
  },
};

// ─── SPANISH ───────────────────────────────────────────────
const es: ToolStrings = {
  title: 'Título',
  titlePlaceholder: 'ej. Biología Cap.3 Quiz',
  back: '← Volver',
  generating: 'Generando',
  workingOnIt: 'Trabajando...',
  sourceInputPlaceholder: 'Pega o escribe tu material fuente...',
  import: 'Importar',
  couldNotParse: 'No se pudo analizar',
  questions: 'Preguntas',
  cards: 'Tarjetas',
  length: 'Longitud',
  short: 'Corto',
  medium: 'Medio',
  long: 'Largo',

  quiz: {
    generate: 'Generar quiz',
    generatingTitle: 'Generando quiz',
    createQuiz: 'Crear quiz',
    parseError: 'El contenido no pudo ser reconocido como un quiz.',
    labels: { pack: 'Pack', mode: 'Modo', difficulty: 'Dificultad', questionType: 'Tipo de pregunta', feedback: 'Retroalimentación', gradingStrictness: 'Rigurosidad', spellingTolerance: 'Tolerancia ortográfica', partialCredit: 'Crédito parcial', gradingMethod: 'Método de calificación' },
    modeOptions: [
      { value: 'practice', label: 'Relajado', description: 'Modo relajado con pistas y explicaciones' },
      { value: 'normal', label: 'Clásico', description: 'Quiz estándar con puntuación al final' },
      { value: 'exam', label: 'Lockdown', description: 'Examen cronometrado estricto — sin retroceder' },
      { value: 'survival', label: 'Supervivencia', description: 'Preguntas sin fin hasta que falles' },
      { value: 'speedrun', label: 'Speedrun', description: 'Responde todo lo que puedas en el tiempo límite' },
      { value: 'adaptive', label: 'Inteligente', description: 'La dificultad se ajusta a tu rendimiento' },
      { value: 'boss-fight', label: 'Boss Fight', description: 'Una pregunta extremadamente difícil en varias partes' },
      { value: 'duel', label: 'Duelo', description: 'Compite contra un oponente IA' },
      { value: 'blitz', label: 'Blitz', description: '5 segundos por pregunta, pura velocidad' },
      { value: 'reverse', label: 'Inverso', description: 'Dada la respuesta, encuentra la pregunta' },
      { value: 'elimination', label: 'Eliminación', description: 'Las respuestas incorrectas eliminan opciones' },
    ],
    packOptions: [
      { value: 'practice', label: 'Calentamiento', description: 'Preguntas ligeras enfocadas en comprensión' },
      { value: 'exam', label: 'Listo para el examen', description: 'Preguntas rigurosas a nivel de examen' },
      { value: 'adaptive', label: 'Mezcla variada', description: 'Mix de dificultades que se adapta' },
      { value: 'deep-dive', label: 'Profundización', description: 'Casos límite, excepciones y matices' },
      { value: 'rapid-review', label: 'Repaso rápido', description: 'Preguntas rápidas de amplio espectro' },
      { value: 'application', label: 'Mundo real', description: 'Preguntas basadas en escenarios reales' },
    ],
    difficultyOptions: [
      { value: 'balanced', label: 'Equilibrado', description: 'Mezcla equitativa de fácil, medio y difícil' },
      { value: 'ramp', label: 'Progresivo', description: 'Empieza fácil y se pone más difícil' },
      { value: 'hard', label: 'Difícil', description: 'Todas las preguntas son desafiantes desde el inicio' },
      { value: 'easy', label: 'Fácil', description: 'Preguntas para principiantes' },
      { value: 'random', label: 'Aleatorio', description: 'Distribución completamente aleatoria' },
      { value: 'inverted', label: 'Invertido', description: 'Empieza difícil y se facilita' },
    ],
    questionTypeOptions: [
      { value: 'mixed', label: 'Mixto', description: 'Combinación de todos los tipos' },
      { value: 'multiple-choice', label: 'Opción múltiple', description: 'Elige la respuesta correcta' },
      { value: 'true-false', label: 'Verdadero/Falso', description: 'Enunciados simples verdadero o falso' },
      { value: 'fill-blank', label: 'Completar', description: 'Completa la palabra o frase faltante' },
      { value: 'short-answer', label: 'Respuesta corta', description: 'Escribe una breve respuesta' },
      { value: 'matching', label: 'Emparejar', description: 'Empareja elementos de dos columnas' },
      { value: 'ordering', label: 'Ordenar', description: 'Pon los elementos en la secuencia correcta' },
    ],
    feedbackOptions: [
      { value: 'immediate', label: 'Inmediato', description: 'Ve si acertaste después de cada pregunta' },
      { value: 'end', label: 'Al final', description: 'Revisa todas las respuestas al terminar' },
      { value: 'detailed', label: 'Detallado', description: 'Explicación completa con referencias' },
      { value: 'minimal', label: 'Mínimo', description: 'Solo correcto/incorrecto, sin explicaciones' },
      { value: 'none', label: 'Ninguno', description: 'Sin retroalimentación — solo puntuación' },
    ],
    gradingStrictnessOptions: [
      { value: 'exact', label: 'Exacto', description: 'La respuesta debe coincidir exactamente' },
      { value: 'strict', label: 'Estricto', description: 'Coincidencia muy cercana requerida' },
      { value: 'moderate', label: 'Moderado', description: 'Acepta respuestas semánticamente correctas' },
      { value: 'lenient', label: 'Flexible', description: 'Acepta cualquier respuesta que demuestre comprensión' },
      { value: 'conceptual', label: 'Conceptual', description: 'Solo verifica el concepto principal' },
    ],
    spellingToleranceOptions: [
      { value: 'none', label: 'Sin tolerancia', description: 'Los errores ortográficos cuentan como incorrectos' },
      { value: 'strict', label: 'Estricto', description: 'Solo 1 carácter de diferencia permitido' },
      { value: 'lenient', label: 'Flexible', description: 'Permite errores tipográficos menores' },
      { value: 'ignore', label: 'Ignorar', description: 'La ortografía se ignora completamente' },
    ],
    partialCreditOptions: [
      { value: 'enabled', label: 'Activado', description: 'Puntos parciales por respuestas parcialmente correctas' },
      { value: 'disabled', label: 'Desactivado', description: 'Todo o nada — sin crédito parcial' },
      { value: 'generous', label: 'Generoso', description: 'Crédito por cualquier conocimiento relevante' },
      { value: 'weighted', label: 'Ponderado', description: 'Crédito parcial escalado por precisión' },
    ],
    gradingMethodOptions: [
      { value: 'auto', label: 'Auto', description: 'La IA califica automáticamente' },
      { value: 'self', label: 'Autoevaluación', description: 'Evalúate — compara con la respuesta correcta' },
      { value: 'ai-review', label: 'Revisión IA', description: 'La IA califica y da sugerencias de mejora' },
      { value: 'off', label: 'Desactivado', description: 'Sin calificación — solo práctica' },
      { value: 'peer', label: 'Par', description: 'Comparte respuestas para revisión entre pares' },
    ],
  },

  flashcards: {
    generate: 'Generar flashcards',
    generatingTitle: 'Generando flashcards',
    createFlashcards: 'Crear flashcards',
    parseError: 'El contenido no pudo ser reconocido como flashcards.',
    labels: { pack: 'Pack', studyMode: 'Modo de estudio', retention: 'Retención', cardStyle: 'Estilo de tarjeta', complexity: 'Complejidad' },
    studyModeOptions: [
      { value: 'flip', label: 'Standard', description: 'Classic flip card mode' },
      { value: 'type', label: 'Type', description: 'Type your answer before revealing the correct one' },
      { value: 'multiple-choice', label: 'Multiple Choice', description: 'Choose the correct answer from 3 related options' },
    ],
    packOptions: [
      { value: 'core', label: 'Esenciales', description: 'Términos y definiciones esenciales' },
      { value: 'retention', label: 'Memorizar', description: 'Optimizado para memoria a largo plazo' },
      { value: 'exam', label: 'Listo para examen', description: 'Preguntas de examen con distractores' },
      { value: 'deep-dive', label: 'Profundización', description: 'Tarjetas sobre casos límite y detalles' },
      { value: 'quick-review', label: 'Escaneo rápido', description: 'Tarjetas de resumen para revisión rápida' },
      { value: 'application', label: 'Mundo real', description: 'Aplica conceptos a escenarios reales' },
      { value: 'connections', label: 'Conexiones', description: 'Tarjetas que vinculan conceptos relacionados' },
    ],
    retentionOptions: [
      { value: 'balanced', label: 'Equilibrado', description: 'Calendario de repetición estándar' },
      { value: 'aggressive', label: 'Intensivo', description: 'Más repeticiones, intervalos más cortos' },
      { value: 'exam-cram', label: 'Estudio intensivo', description: 'Memorización intensiva a corto plazo' },
      { value: 'long-term', label: 'Largo plazo', description: 'Intervalos extendidos para retención duradera' },
      { value: 'weak-focus', label: 'Puntos débiles', description: 'Prioriza tarjetas que sigues fallando' },
    ],
    cardStyleOptions: [
      { value: 'standard', label: 'Estándar', description: 'Formato simple de pregunta y respuesta' },
      { value: 'cloze', label: 'Completar', description: 'Rellenar dentro de una oración' },
      { value: 'image-occlusion', label: 'Imagen', description: 'Ocultar partes de diagramas' },
      { value: 'reversed', label: 'Invertido', description: 'Respuesta primero — recuerda la pregunta' },
      { value: 'context', label: 'Contexto', description: 'Con contexto circundante para mejor comprensión' },
      { value: 'mnemonic', label: 'Mnemónico', description: 'Con trucos de memoria y asociaciones' },
    ],
    complexityOptions: [
      { value: 'simple', label: 'Simple', description: 'Hechos y definiciones individuales' },
      { value: 'medium', label: 'Medio', description: 'Conceptos que requieren algo de explicación' },
      { value: 'complex', label: 'Complejo', description: 'Ideas multicapa con conexiones' },
      { value: 'expert', label: 'Experto', description: 'Material avanzado que requiere síntesis' },
    ],
  },

  notes: {
    generate: 'Generar notas',
    generatingTitle: 'Generando notas',
    parseError: 'El contenido no pudo ser reconocido como notas.',
    labels: { pack: 'Pack', style: 'Estilo', focus: 'Enfoque', tone: 'Tono', audience: 'Audiencia' },
    packOptions: [
      { value: 'core', label: 'Esenciales', description: 'Conceptos clave e ideas principales' },
      { value: 'exam', label: 'Listo para examen', description: 'Notas enfocadas en examen' },
      { value: 'reference', label: 'Referencia completa', description: 'Material de referencia completo' },
      { value: 'lecture', label: 'Clase', description: 'Sigue el flujo de una clase' },
      { value: 'revision', label: 'Escaneo rápido', description: 'Resúmenes ultra-condensados' },
      { value: 'research', label: 'Académico', description: 'Estilo académico con citas y evidencia' },
    ],
    styleOptions: [
      { value: 'structured', label: 'Estructurado', description: 'Títulos jerárquicos con secciones organizadas' },
      { value: 'standard', label: 'Estándar', description: 'Notas basadas en párrafos' },
      { value: 'bullet-points', label: 'Cornell', description: 'Formato Cornell de dos columnas' },
      { value: 'timeline', label: 'Cronología', description: 'Secuencia cronológica de eventos' },
      { value: 'mindmap', label: 'Mapa mental', description: 'Estructura visual ramificada' },
      { value: 'vocabulary', label: 'Vocabulario', description: 'Pares término-definición por tema' },
      { value: 'outline', label: 'Esquema', description: 'Esquema numerado con subpuntos' },
      { value: 'charting', label: 'Tabla', description: 'Comparación tabular de categorías' },
      { value: 'flow', label: 'Flujo', description: 'Notas de proceso paso a paso' },
      { value: 'q-and-a', label: 'P&R', description: 'Pares pregunta-respuesta para autoevaluación' },
    ],
    focusOptions: [
      { value: 'clarity', label: 'Claridad', description: 'Prioriza explicaciones claras y comprensibles' },
      { value: 'compression', label: 'Estudio intensivo', description: 'Máxima información en mínimo espacio' },
      { value: 'retention', label: 'Retención', description: 'Estructurado para memoria a largo plazo' },
      { value: 'understanding', label: 'Comprensión', description: 'Explicaciones profundas con ejemplos' },
      { value: 'application', label: 'Aplicación', description: 'Cómo aplicar conceptos en la práctica' },
      { value: 'synthesis', label: 'Síntesis', description: 'Conecta ideas entre temas y encuentra patrones' },
    ],
    toneOptions: [
      { value: 'neutral', label: 'Neutral', description: 'Tono académico estándar' },
      { value: 'casual', label: 'Informal', description: 'Amigable y accesible' },
      { value: 'formal', label: 'Formal', description: 'Lenguaje académico profesional y preciso' },
      { value: 'simplified', label: 'Simplificado', description: 'Lenguaje sencillo, evita jerga' },
      { value: 'technical', label: 'Técnico', description: 'Vocabulario técnico completo sin simplificación' },
    ],
    audienceOptions: [
      { value: 'student', label: 'Estudiante', description: 'Para estudiantes que encuentran el material por primera vez' },
      { value: 'advanced', label: 'Avanzado', description: 'Asume conocimiento previo, omite lo básico' },
      { value: 'teacher', label: 'Profesor', description: 'Orientado a la enseñanza con notas pedagógicas' },
      { value: 'professional', label: 'Profesional', description: 'Enfoque práctico para aplicación laboral' },
      { value: 'researcher', label: 'Investigador', description: 'Enfatiza metodología, evidencia y brechas' },
    ],
  },
};

// ─── RUSSIAN ───────────────────────────────────────────────
const ru: ToolStrings = {
  title: 'Название',
  titlePlaceholder: 'напр. Биология Гл.3 Тест',
  back: '← Назад',
  generating: 'Генерация',
  workingOnIt: 'Работаем...',
  sourceInputPlaceholder: 'Вставьте или введите исходный материал...',
  import: 'Импорт',
  couldNotParse: 'Не удалось обработать',
  questions: 'Вопросы',
  cards: 'Карточки',
  length: 'Длина',
  short: 'Короткий',
  medium: 'Средний',
  long: 'Длинный',

  quiz: {
    generate: 'Создать тест',
    generatingTitle: 'Создание теста',
    createQuiz: 'Создать тест',
    parseError: 'Содержимое не может быть распознано как тест.',
    labels: { pack: 'Пакет', mode: 'Режим', difficulty: 'Сложность', questionType: 'Тип вопроса', feedback: 'Обратная связь', gradingStrictness: 'Строгость оценки', spellingTolerance: 'Допуск ошибок', partialCredit: 'Частичный балл', gradingMethod: 'Метод оценки' },
    modeOptions: [
      { value: 'practice', label: 'Спокойный', description: 'Расслабленный режим с подсказками и объяснениями' },
      { value: 'normal', label: 'Классический', description: 'Стандартный тест с баллом в конце' },
      { value: 'exam', label: 'Экзамен', description: 'Строгий экзамен с таймером — без возврата и подсказок' },
      { value: 'survival', label: 'Выживание', description: 'Бесконечные вопросы до первой ошибки' },
      { value: 'speedrun', label: 'Спидран', description: 'Ответьте на максимум вопросов за время' },
      { value: 'adaptive', label: 'Умный', description: 'Сложность подстраивается под ваш уровень' },
      { value: 'boss-fight', label: 'Босс-файт', description: 'Один очень сложный многочастный вопрос' },
      { value: 'duel', label: 'Дуэль', description: 'Соревнуйтесь с ИИ-противником' },
      { value: 'blitz', label: 'Блиц', description: '5 секунд на вопрос, чистая скорость' },
      { value: 'reverse', label: 'Обратный', description: 'Дан ответ — угадайте вопрос' },
      { value: 'elimination', label: 'Исключение', description: 'Неверные ответы убирают варианты' },
    ],
    packOptions: [
      { value: 'practice', label: 'Разминка', description: 'Лёгкие вопросы для понимания' },
      { value: 'exam', label: 'К экзамену', description: 'Строгие вопросы экзаменного уровня' },
      { value: 'adaptive', label: 'Микс', description: 'Смесь сложностей, адаптируется к уровню' },
      { value: 'deep-dive', label: 'Погружение', description: 'Фокус на нюансах и исключениях' },
      { value: 'rapid-review', label: 'Быстрый обзор', description: 'Быстрые вопросы по широкому спектру' },
      { value: 'application', label: 'Практика', description: 'Вопросы на применение в реальных ситуациях' },
    ],
    difficultyOptions: [
      { value: 'balanced', label: 'Сбалансированный', description: 'Равный микс лёгких, средних и сложных вопросов' },
      { value: 'ramp', label: 'Нарастающий', description: 'Начинается легко, постепенно усложняется' },
      { value: 'hard', label: 'Сложный', description: 'Все вопросы сложные с самого начала' },
      { value: 'easy', label: 'Лёгкий', description: 'Вопросы для начинающих' },
      { value: 'random', label: 'Случайный', description: 'Полностью случайное распределение' },
      { value: 'inverted', label: 'Обратный', description: 'Начинается сложно и упрощается' },
    ],
    questionTypeOptions: [
      { value: 'mixed', label: 'Смешанный', description: 'Комбинация всех типов вопросов' },
      { value: 'multiple-choice', label: 'Выбор ответа', description: 'Выберите правильный ответ' },
      { value: 'true-false', label: 'Верно/Неверно', description: 'Простые утверждения верно или неверно' },
      { value: 'fill-blank', label: 'Заполнить пропуск', description: 'Дополните пропущенное слово или фразу' },
      { value: 'short-answer', label: 'Короткий ответ', description: 'Напишите краткий ответ своими словами' },
      { value: 'matching', label: 'Сопоставление', description: 'Сопоставьте элементы из двух столбцов' },
      { value: 'ordering', label: 'Порядок', description: 'Расставьте элементы в правильном порядке' },
    ],
    feedbackOptions: [
      { value: 'immediate', label: 'Сразу', description: 'Узнайте правильность после каждого вопроса' },
      { value: 'end', label: 'В конце', description: 'Просмотр всех ответов в конце' },
      { value: 'detailed', label: 'Подробный', description: 'Полное объяснение со ссылками на источники' },
      { value: 'minimal', label: 'Минимальный', description: 'Только правильно/неправильно' },
      { value: 'none', label: 'Нет', description: 'Без обратной связи — только балл' },
    ],
    gradingStrictnessOptions: [
      { value: 'exact', label: 'Точный', description: 'Ответ должен совпасть точно' },
      { value: 'strict', label: 'Строгий', description: 'Требуется очень близкое совпадение' },
      { value: 'moderate', label: 'Умеренный', description: 'Принимает семантически правильные ответы' },
      { value: 'lenient', label: 'Мягкий', description: 'Принимает любой ответ, показывающий понимание' },
      { value: 'conceptual', label: 'Концептуальный', description: 'Проверяет только основную идею' },
    ],
    spellingToleranceOptions: [
      { value: 'none', label: 'Без допуска', description: 'Орфографические ошибки считаются неправильными' },
      { value: 'strict', label: 'Строго', description: 'Допускается 1 символ разницы' },
      { value: 'lenient', label: 'Мягко', description: 'Допускает мелкие опечатки' },
      { value: 'ignore', label: 'Игнорировать', description: 'Орфография полностью игнорируется' },
    ],
    partialCreditOptions: [
      { value: 'enabled', label: 'Включено', description: 'Частичные баллы за частично правильные ответы' },
      { value: 'disabled', label: 'Выключено', description: 'Всё или ничего — без частичных баллов' },
      { value: 'generous', label: 'Щедрый', description: 'Баллы за любые релевантные знания' },
      { value: 'weighted', label: 'Взвешенный', description: 'Частичные баллы по степени точности' },
    ],
    gradingMethodOptions: [
      { value: 'auto', label: 'Авто', description: 'ИИ оценивает автоматически' },
      { value: 'self', label: 'Самооценка', description: 'Оцените себя — сравните с правильным ответом' },
      { value: 'ai-review', label: 'Обзор ИИ', description: 'ИИ оценивает и даёт рекомендации' },
      { value: 'off', label: 'Выкл', description: 'Без оценки — только практика' },
      { value: 'peer', label: 'Пир', description: 'Поделитесь ответами для взаимной проверки' },
    ],
  },

  flashcards: {
    generate: 'Создать карточки',
    generatingTitle: 'Создание карточек',
    createFlashcards: 'Создать карточки',
    parseError: 'Содержимое не распознано как карточки.',
    labels: { pack: 'Пакет', studyMode: 'Режим изучения', retention: 'Запоминание', cardStyle: 'Стиль карточки', complexity: 'Сложность' },
    studyModeOptions: [
      { value: 'flip', label: 'Standard', description: 'Classic flip card mode' },
      { value: 'type', label: 'Type', description: 'Type your answer before revealing the correct one' },
      { value: 'multiple-choice', label: 'Multiple Choice', description: 'Choose the correct answer from 3 related options' },
    ],
    packOptions: [
      { value: 'core', label: 'Основы', description: 'Ключевые термины и определения' },
      { value: 'retention', label: 'Запоминание', description: 'Оптимизировано для долгосрочной памяти' },
      { value: 'exam', label: 'К экзамену', description: 'Экзаменационные вопросы с ловушками' },
      { value: 'deep-dive', label: 'Погружение', description: 'Нюансированные карточки о деталях' },
      { value: 'quick-review', label: 'Быстрый обзор', description: 'Обзорные карточки для быстрого повторения' },
      { value: 'application', label: 'Практика', description: 'Применение концепций в реальных ситуациях' },
      { value: 'connections', label: 'Связи', description: 'Карточки, связывающие концепции между темами' },
    ],
    retentionOptions: [
      { value: 'balanced', label: 'Сбалансированный', description: 'Стандартный график повторения' },
      { value: 'aggressive', label: 'Интенсивный', description: 'Больше повторений, короче интервалы' },
      { value: 'exam-cram', label: 'Зубрёжка', description: 'Интенсивное запоминание перед экзаменом' },
      { value: 'long-term', label: 'Долгосрочный', description: 'Длинные интервалы для месяцев запоминания' },
      { value: 'weak-focus', label: 'Слабые места', description: 'Приоритет карточкам, которые вы путаете' },
    ],
    cardStyleOptions: [
      { value: 'standard', label: 'Стандарт', description: 'Простой формат вопрос-ответ' },
      { value: 'cloze', label: 'Пропуск', description: 'Заполнить пропуск в предложении' },
      { value: 'image-occlusion', label: 'Изображение', description: 'Скрыть части диаграмм для проверки' },
      { value: 'reversed', label: 'Обратный', description: 'Сначала ответ — вспомните вопрос' },
      { value: 'context', label: 'Контекст', description: 'С окружающим контекстом для понимания' },
      { value: 'mnemonic', label: 'Мнемоника', description: 'С приёмами запоминания и ассоциациями' },
    ],
    complexityOptions: [
      { value: 'simple', label: 'Простой', description: 'Отдельные факты и определения' },
      { value: 'medium', label: 'Средний', description: 'Концепции, требующие пояснения' },
      { value: 'complex', label: 'Сложный', description: 'Многоуровневые идеи со связями' },
      { value: 'expert', label: 'Эксперт', description: 'Продвинутый материал с синтезом' },
    ],
  },

  notes: {
    generate: 'Создать заметки',
    generatingTitle: 'Создание заметок',
    parseError: 'Содержимое не распознано как заметки.',
    labels: { pack: 'Пакет', style: 'Стиль', focus: 'Фокус', tone: 'Тон', audience: 'Аудитория' },
    packOptions: [
      { value: 'core', label: 'Основы', description: 'Ключевые концепции и главные идеи' },
      { value: 'exam', label: 'К экзамену', description: 'Заметки для экзамена с проверяемыми фактами' },
      { value: 'reference', label: 'Справочник', description: 'Полный справочный материал' },
      { value: 'lecture', label: 'Лекция', description: 'Следует ходу лекции' },
      { value: 'revision', label: 'Быстрый обзор', description: 'Ультракраткие резюме для быстрого повторения' },
      { value: 'research', label: 'Академический', description: 'Академический стиль с цитатами' },
    ],
    styleOptions: [
      { value: 'structured', label: 'Структурированный', description: 'Иерархические заголовки с организованными разделами' },
      { value: 'standard', label: 'Стандарт', description: 'Чистые заметки на основе абзацев' },
      { value: 'bullet-points', label: 'Корнелл', description: 'Двухколоночный формат Корнелл' },
      { value: 'timeline', label: 'Хронология', description: 'Хронологическая последовательность событий' },
      { value: 'mindmap', label: 'Карта ума', description: 'Визуальная ветвящаяся структура' },
      { value: 'vocabulary', label: 'Словарь', description: 'Пары термин-определение по темам' },
      { value: 'outline', label: 'План', description: 'Нумерованный план с подпунктами' },
      { value: 'charting', label: 'Таблица', description: 'Табличное сравнение категорий' },
      { value: 'flow', label: 'Поток', description: 'Пошаговые заметки по процессам' },
      { value: 'q-and-a', label: 'В&О', description: 'Пары вопрос-ответ для самопроверки' },
    ],
    focusOptions: [
      { value: 'clarity', label: 'Ясность', description: 'Приоритет ясным и понятным объяснениям' },
      { value: 'compression', label: 'Зубрёжка', description: 'Максимум информации в минимуме места' },
      { value: 'retention', label: 'Запоминание', description: 'Структурировано для долгосрочной памяти' },
      { value: 'understanding', label: 'Понимание', description: 'Глубокие объяснения с примерами' },
      { value: 'application', label: 'Применение', description: 'Как применять концепции на практике' },
      { value: 'synthesis', label: 'Синтез', description: 'Связывает идеи между темами' },
    ],
    toneOptions: [
      { value: 'neutral', label: 'Нейтральный', description: 'Стандартный академический тон' },
      { value: 'casual', label: 'Неформальный', description: 'Дружелюбный и доступный' },
      { value: 'formal', label: 'Формальный', description: 'Профессиональный и точный язык' },
      { value: 'simplified', label: 'Упрощённый', description: 'Простой язык без жаргона' },
      { value: 'technical', label: 'Технический', description: 'Полная техническая терминология' },
    ],
    audienceOptions: [
      { value: 'student', label: 'Ученик', description: 'Для тех, кто знакомится с материалом впервые' },
      { value: 'advanced', label: 'Продвинутый', description: 'Предполагает базовые знания' },
      { value: 'teacher', label: 'Учитель', description: 'С педагогическими заметками' },
      { value: 'professional', label: 'Профессионал', description: 'Практический фокус для работы' },
      { value: 'researcher', label: 'Исследователь', description: 'Акцент на методологии и доказательствах' },
    ],
  },
};

// ─── CHINESE ───────────────────────────────────────────────
const zh: ToolStrings = {
  title: '标题',
  titlePlaceholder: '例如 生物第3章测验',
  back: '← 返回',
  generating: '生成中',
  workingOnIt: '正在处理...',
  sourceInputPlaceholder: '粘贴或输入您的源材料...',
  import: '导入',
  couldNotParse: '无法解析',
  questions: '问题',
  cards: '卡片',
  length: '长度',
  short: '短',
  medium: '中',
  long: '长',

  quiz: {
    generate: '生成测验',
    generatingTitle: '正在生成测验',
    createQuiz: '创建测验',
    parseError: '内容无法识别为测验。',
    labels: { pack: '包', mode: '模式', difficulty: '难度', questionType: '题目类型', feedback: '反馈', gradingStrictness: '评分严格度', spellingTolerance: '拼写容错', partialCredit: '部分得分', gradingMethod: '评分方法' },
    modeOptions: [
      { value: 'practice', label: '轻松', description: '轻松模式，每题后有提示和解释' },
      { value: 'normal', label: '经典', description: '标准测验，最后显示分数' },
      { value: 'exam', label: '考试', description: '严格计时考试——不能返回，无提示' },
      { value: 'survival', label: '生存', description: '无限题目直到答错' },
      { value: 'speedrun', label: '竞速', description: '在时间限制内尽可能多地回答' },
      { value: 'adaptive', label: '智能', description: '难度根据你的表现自动调整' },
      { value: 'boss-fight', label: 'Boss战', description: '一道极其困难的多部分题目' },
      { value: 'duel', label: '对决', description: '与AI对手一对一竞争' },
      { value: 'blitz', label: '闪电', description: '每题5秒，纯速度' },
      { value: 'reverse', label: '反转', description: '给出答案，找出问题' },
      { value: 'elimination', label: '淘汰', description: '错误答案逐步移除选项' },
    ],
    packOptions: [
      { value: 'practice', label: '热身', description: '侧重于理解概念的轻松题目' },
      { value: 'exam', label: '备考', description: '与真实考试难度相匹配的严格题目' },
      { value: 'adaptive', label: '混合', description: '混合难度，自动适应你的水平' },
      { value: 'deep-dive', label: '深入', description: '关注边界情况、例外和细微差别' },
      { value: 'rapid-review', label: '快速复习', description: '覆盖面广的快速题目' },
      { value: 'application', label: '实战', description: '基于场景的实际应用题目' },
    ],
    difficultyOptions: [
      { value: 'balanced', label: '均衡', description: '简单、中等和困难题目的均匀混合' },
      { value: 'ramp', label: '递进', description: '从简单开始逐渐变难' },
      { value: 'hard', label: '困难', description: '所有题目从一开始就有挑战性' },
      { value: 'easy', label: '简单', description: '适合初学者建立信心' },
      { value: 'random', label: '随机', description: '完全随机的难度分布' },
      { value: 'inverted', label: '倒序', description: '从困难开始逐渐变简单' },
    ],
    questionTypeOptions: [
      { value: 'mixed', label: '混合', description: '所有题目类型的组合' },
      { value: 'multiple-choice', label: '选择题', description: '从选项中选择正确答案' },
      { value: 'true-false', label: '判断题', description: '简单的对错判断' },
      { value: 'fill-blank', label: '填空题', description: '填写缺失的词或短语' },
      { value: 'short-answer', label: '简答题', description: '用自己的话写一个简短回答' },
      { value: 'matching', label: '匹配题', description: '将两列的项目匹配在一起' },
      { value: 'ordering', label: '排序题', description: '将项目按正确顺序排列' },
    ],
    feedbackOptions: [
      { value: 'immediate', label: '立即', description: '每题后查看是否正确' },
      { value: 'end', label: '结束时', description: '测验结束后一起查看所有答案' },
      { value: 'detailed', label: '详细', description: '带来源引用的完整解释' },
      { value: 'minimal', label: '最少', description: '仅显示正确/错误，无解释' },
      { value: 'none', label: '无', description: '完全没有反馈——仅分数' },
    ],
    gradingStrictnessOptions: [
      { value: 'exact', label: '精确', description: '答案必须完全匹配' },
      { value: 'strict', label: '严格', description: '需要非常接近的匹配' },
      { value: 'moderate', label: '适中', description: '接受语义正确的不同表述' },
      { value: 'lenient', label: '宽松', description: '接受任何展示理解的答案' },
      { value: 'conceptual', label: '概念', description: '只检查核心概念是否正确' },
    ],
    spellingToleranceOptions: [
      { value: 'none', label: '不容错', description: '拼写错误算作错误答案' },
      { value: 'strict', label: '严格', description: '只允许1个字符差异' },
      { value: 'lenient', label: '宽松', description: '允许小的拼写错误' },
      { value: 'ignore', label: '忽略', description: '评分时完全忽略拼写' },
    ],
    partialCreditOptions: [
      { value: 'enabled', label: '启用', description: '部分正确的答案可获得部分分数' },
      { value: 'disabled', label: '禁用', description: '全对或全错——无部分得分' },
      { value: 'generous', label: '慷慨', description: '对任何相关知识给予分数' },
      { value: 'weighted', label: '加权', description: '根据答案接近程度按比例给分' },
    ],
    gradingMethodOptions: [
      { value: 'auto', label: '自动', description: 'AI根据设置自动评分' },
      { value: 'self', label: '自评', description: '自己评分——与正确答案对比' },
      { value: 'ai-review', label: 'AI审查', description: 'AI评分并提供改进建议' },
      { value: 'off', label: '关闭', description: '不评分——仅练习' },
      { value: 'peer', label: '互评', description: '分享答案进行互相评审' },
    ],
  },

  flashcards: {
    generate: '生成闪卡',
    generatingTitle: '正在生成闪卡',
    createFlashcards: '创建闪卡',
    parseError: '内容无法识别为闪卡。',
    labels: { pack: '包', studyMode: '学习模式', retention: '记忆', cardStyle: '卡片样式', complexity: '复杂度' },
    studyModeOptions: [
      { value: 'flip', label: 'Standard', description: 'Classic flip card mode' },
      { value: 'type', label: 'Type', description: 'Type your answer before revealing the correct one' },
      { value: 'multiple-choice', label: 'Multiple Choice', description: 'Choose the correct answer from 3 related options' },
    ],
    packOptions: [
      { value: 'core', label: '基础', description: '材料中的核心术语和定义' },
      { value: 'retention', label: '记忆', description: '为长期记忆优化的间隔重复' },
      { value: 'exam', label: '备考', description: '考试风格的题目含干扰项' },
      { value: 'deep-dive', label: '深入', description: '涵盖边界情况和细节的卡片' },
      { value: 'quick-review', label: '快速扫描', description: '用于快速复习的概览卡片' },
      { value: 'application', label: '实战', description: '将概念应用到实际场景' },
      { value: 'connections', label: '关联', description: '跨主题连接相关概念的卡片' },
    ],
    retentionOptions: [
      { value: 'balanced', label: '均衡', description: '标准重复计划，稳步学习' },
      { value: 'aggressive', label: '强化', description: '更多重复，更短间隔' },
      { value: 'exam-cram', label: '突击', description: '考前密集短期记忆' },
      { value: 'long-term', label: '长期', description: '为持久记忆优化的长间隔' },
      { value: 'weak-focus', label: '薄弱项', description: '优先处理你经常答错的卡片' },
    ],
    cardStyleOptions: [
      { value: 'standard', label: '标准', description: '简单的正反面问答格式' },
      { value: 'cloze', label: '填空', description: '在句子或段落中填空' },
      { value: 'image-occlusion', label: '图片', description: '隐藏图表部分来测试记忆' },
      { value: 'reversed', label: '反转', description: '先显示答案——回忆问题/术语' },
      { value: 'context', label: '上下文', description: '包含周围语境以便更好理解' },
      { value: 'mnemonic', label: '助记', description: '包含记忆技巧和联想' },
    ],
    complexityOptions: [
      { value: 'simple', label: '简单', description: '单一事实和定义' },
      { value: 'medium', label: '中等', description: '需要一些解释的概念' },
      { value: 'complex', label: '复杂', description: '有关联的多层次概念' },
      { value: 'expert', label: '专家', description: '需要综合能力的高级材料' },
    ],
  },

  notes: {
    generate: '生成笔记',
    generatingTitle: '正在生成笔记',
    parseError: '内容无法识别为笔记。',
    labels: { pack: '包', style: '风格', focus: '重点', tone: '语调', audience: '受众' },
    packOptions: [
      { value: 'core', label: '核心', description: '关键概念和主要思想清晰提炼' },
      { value: 'exam', label: '备考', description: '以考试为导向突出可测试的事实' },
      { value: 'reference', label: '完整参考', description: '全面详细的参考材料' },
      { value: 'lecture', label: '课堂', description: '跟随课堂讲解流程' },
      { value: 'revision', label: '快速扫描', description: '用于快速复习的超压缩总结' },
      { value: 'research', label: '学术', description: '带引用和证据的学术风格笔记' },
    ],
    styleOptions: [
      { value: 'structured', label: '结构化', description: '层级标题和有组织的章节' },
      { value: 'standard', label: '标准', description: '基于段落的整洁笔记' },
      { value: 'bullet-points', label: '康奈尔', description: '带提示和总结的双栏康奈尔格式' },
      { value: 'timeline', label: '时间线', description: '事件和发展的时间顺序' },
      { value: 'mindmap', label: '思维导图', description: '展示关系的可视化分支结构' },
      { value: 'vocabulary', label: '词汇表', description: '按主题组织的术语-定义对' },
      { value: 'outline', label: '大纲', description: '带缩进子点的编号大纲' },
      { value: 'charting', label: '图表', description: '基于表格的类别和属性比较' },
      { value: 'flow', label: '流程', description: '程序和方法的分步笔记' },
      { value: 'q-and-a', label: '问答', description: '用于自测的问答对' },
    ],
    focusOptions: [
      { value: 'clarity', label: '清晰', description: '优先考虑清晰易懂的解释' },
      { value: 'compression', label: '压缩', description: '最小空间内最大信息量' },
      { value: 'retention', label: '记忆', description: '为长期记忆结构化并附带重复提示' },
      { value: 'understanding', label: '理解', description: '带示例和类比的深度解释' },
      { value: 'application', label: '应用', description: '如何在实践中应用概念' },
      { value: 'synthesis', label: '综合', description: '跨主题连接思想，发现规律' },
    ],
    toneOptions: [
      { value: 'neutral', label: '中性', description: '标准学术语调' },
      { value: 'casual', label: '随意', description: '友好亲切，像学习伙伴' },
      { value: 'formal', label: '正式', description: '专业精确的学术语言' },
      { value: 'simplified', label: '简化', description: '简单语言，尽量避免术语' },
      { value: 'technical', label: '技术', description: '不简化的完整技术词汇' },
    ],
    audienceOptions: [
      { value: 'student', label: '学生', description: '为初次接触材料的学习者定制' },
      { value: 'advanced', label: '进阶', description: '假设有基础知识，跳过基础' },
      { value: 'teacher', label: '教师', description: '以教学为导向附带教学注释' },
      { value: 'professional', label: '专业人士', description: '面向工作应用的实用重点' },
      { value: 'researcher', label: '研究者', description: '强调方法论、证据和空白' },
    ],
  },
};

// ─── POLISH ────────────────────────────────────────────────
const pl: ToolStrings = {
  title: 'Tytuł',
  titlePlaceholder: 'np. Biologia Roz.3 Quiz',
  back: '← Wstecz',
  generating: 'Generowanie',
  workingOnIt: 'Pracuję nad tym...',
  sourceInputPlaceholder: 'Wklej lub wpisz materiał źródłowy...',
  import: 'Importuj',
  couldNotParse: 'Nie udało się przetworzyć',
  questions: 'Pytania',
  cards: 'Karty',
  length: 'Długość',
  short: 'Krótki',
  medium: 'Średni',
  long: 'Długi',
  quiz: { ...en.quiz, generate: 'Generuj quiz', generatingTitle: 'Generowanie quizu', createQuiz: 'Utwórz quiz', parseError: 'Treść nie mogła zostać rozpoznana jako quiz.' },
  flashcards: { ...en.flashcards, generate: 'Generuj fiszki', generatingTitle: 'Generowanie fiszek', createFlashcards: 'Utwórz fiszki', parseError: 'Treść nie mogła zostać rozpoznana jako fiszki.' },
  notes: { ...en.notes, generate: 'Generuj notatki', generatingTitle: 'Generowanie notatek', parseError: 'Treść nie mogła zostać rozpoznana jako notatki.' },
};

// ─── ARABIC ────────────────────────────────────────────────
const ar: ToolStrings = {
  title: 'العنوان',
  titlePlaceholder: 'مثلاً أحياء الفصل 3 اختبار',
  back: '← رجوع',
  generating: 'جاري الإنشاء',
  workingOnIt: 'جاري العمل...',
  sourceInputPlaceholder: 'الصق أو اكتب المادة المصدر...',
  import: 'استيراد',
  couldNotParse: 'لم يتم التعرف عليه',
  questions: 'أسئلة',
  cards: 'بطاقات',
  length: 'الطول',
  short: 'قصير',
  medium: 'متوسط',
  long: 'طويل',
  quiz: { ...en.quiz, generate: 'إنشاء اختبار', generatingTitle: 'جاري إنشاء الاختبار', createQuiz: 'إنشاء اختبار', parseError: 'لم يتم التعرف على المحتوى كاختبار.' },
  flashcards: { ...en.flashcards, generate: 'إنشاء بطاقات', generatingTitle: 'جاري إنشاء البطاقات', createFlashcards: 'إنشاء بطاقات', parseError: 'لم يتم التعرف على المحتوى كبطاقات.' },
  notes: { ...en.notes, generate: 'إنشاء ملاحظات', generatingTitle: 'جاري إنشاء الملاحظات', parseError: 'لم يتم التعرف على المحتوى كملاحظات.' },
};

// ─── HINDI ─────────────────────────────────────────────────
const hi: ToolStrings = {
  title: 'शीर्षक',
  titlePlaceholder: 'जैसे जीव विज्ञान अध्याय 3 क्विज़',
  back: '← वापस',
  generating: 'बना रहे हैं',
  workingOnIt: 'काम हो रहा है...',
  sourceInputPlaceholder: 'अपनी स्रोत सामग्री पेस्ट या टाइप करें...',
  import: 'आयात',
  couldNotParse: 'पार्स नहीं हो सका',
  questions: 'प्रश्न',
  cards: 'कार्ड',
  length: 'लंबाई',
  short: 'छोटा',
  medium: 'मध्यम',
  long: 'लंबा',
  quiz: { ...en.quiz, generate: 'क्विज़ बनाएं', generatingTitle: 'क्विज़ बन रहा है', createQuiz: 'क्विज़ बनाएं', parseError: 'सामग्री को क्विज़ के रूप में पहचाना नहीं जा सका।' },
  flashcards: { ...en.flashcards, generate: 'फ्लैशकार्ड बनाएं', generatingTitle: 'फ्लैशकार्ड बन रहे हैं', createFlashcards: 'फ्लैशकार्ड बनाएं', parseError: 'सामग्री को फ्लैशकार्ड के रूप में पहचाना नहीं जा सका।' },
  notes: { ...en.notes, generate: 'नोट्स बनाएं', generatingTitle: 'नोट्स बन रहे हैं', parseError: 'सामग्री को नोट्स के रूप में पहचाना नहीं जा सका।' },
};

// ─── BENGALI ───────────────────────────────────────────────
const bn: ToolStrings = {
  title: 'শিরোনাম',
  titlePlaceholder: 'যেমন জীববিদ্যা অধ্যায় ৩ কুইজ',
  back: '← পেছনে',
  generating: 'তৈরি হচ্ছে',
  workingOnIt: 'কাজ চলছে...',
  sourceInputPlaceholder: 'আপনার উৎস উপকরণ পেস্ট বা টাইপ করুন...',
  import: 'আমদানি',
  couldNotParse: 'পার্স করা যায়নি',
  questions: 'প্রশ্ন',
  cards: 'কার্ড',
  length: 'দৈর্ঘ্য',
  short: 'ছোট',
  medium: 'মাঝারি',
  long: 'বড়',
  quiz: { ...en.quiz, generate: 'কুইজ তৈরি করুন', generatingTitle: 'কুইজ তৈরি হচ্ছে', createQuiz: 'কুইজ তৈরি করুন', parseError: 'বিষয়বস্তু কুইজ হিসেবে চিহ্নিত হয়নি।' },
  flashcards: { ...en.flashcards, generate: 'ফ্ল্যাশকার্ড তৈরি করুন', generatingTitle: 'ফ্ল্যাশকার্ড তৈরি হচ্ছে', createFlashcards: 'ফ্ল্যাশকার্ড তৈরি করুন', parseError: 'বিষয়বস্তু ফ্ল্যাশকার্ড হিসেবে চিহ্নিত হয়নি।' },
  notes: { ...en.notes, generate: 'নোটস তৈরি করুন', generatingTitle: 'নোটস তৈরি হচ্ছে', parseError: 'বিষয়বস্তু নোটস হিসেবে চিহ্নিত হয়নি।' },
};

// ─── PORTUGUESE ────────────────────────────────────────────
const pt: ToolStrings = {
  title: 'Título',
  titlePlaceholder: 'ex. Biologia Cap.3 Quiz',
  back: '← Voltar',
  generating: 'Gerando',
  workingOnIt: 'Trabalhando...',
  sourceInputPlaceholder: 'Cole ou digite seu material fonte...',
  import: 'Importar',
  couldNotParse: 'Não foi possível analisar',
  questions: 'Perguntas',
  cards: 'Cartões',
  length: 'Comprimento',
  short: 'Curto',
  medium: 'Médio',
  long: 'Longo',
  quiz: { ...en.quiz, generate: 'Gerar quiz', generatingTitle: 'Gerando quiz', createQuiz: 'Criar quiz', parseError: 'O conteúdo não pôde ser reconhecido como um quiz.' },
  flashcards: { ...en.flashcards, generate: 'Gerar flashcards', generatingTitle: 'Gerando flashcards', createFlashcards: 'Criar flashcards', parseError: 'O conteúdo não pôde ser reconhecido como flashcards.' },
  notes: { ...en.notes, generate: 'Gerar notas', generatingTitle: 'Gerando notas', parseError: 'O conteúdo não pôde ser reconhecido como notas.' },
};

// ─── URDU ──────────────────────────────────────────────────
const ur: ToolStrings = {
  title: 'عنوان',
  titlePlaceholder: 'مثلاً حیاتیات باب 3 کوئز',
  back: '← واپس',
  generating: 'بنایا جا رہا ہے',
  workingOnIt: 'کام ہو رہا ہے...',
  sourceInputPlaceholder: 'اپنا ماخذ مواد چسپاں کریں یا ٹائپ کریں...',
  import: 'درآمد',
  couldNotParse: 'پارس نہیں ہو سکا',
  questions: 'سوالات',
  cards: 'کارڈز',
  length: 'طوالت',
  short: 'مختصر',
  medium: 'درمیانہ',
  long: 'طویل',
  quiz: { ...en.quiz, generate: 'کوئز بنائیں', generatingTitle: 'کوئز بنایا جا رہا ہے', createQuiz: 'کوئز بنائیں', parseError: 'مواد کو کوئز کے طور پر پہچانا نہیں جا سکا۔' },
  flashcards: { ...en.flashcards, generate: 'فلیش کارڈ بنائیں', generatingTitle: 'فلیش کارڈ بنائے جا رہے ہیں', createFlashcards: 'فلیش کارڈ بنائیں', parseError: 'مواد کو فلیش کارڈ کے طور پر پہچانا نہیں جا سکا۔' },
  notes: { ...en.notes, generate: 'نوٹس بنائیں', generatingTitle: 'نوٹس بنائے جا رہے ہیں', parseError: 'مواد کو نوٹس کے طور پر پہچانا نہیں جا سکا۔' },
};

const allStrings: Record<string, ToolStrings> = { en, nl, de, fr, es, ru, zh, pl, ar, hi, bn, pt, ur };

export function getToolStrings(locale: Locale): ToolStrings {
  return allStrings[locale] || en;
}

export type { ToolStrings };

