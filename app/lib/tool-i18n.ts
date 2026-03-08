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
      { value: 'exam', label: 'Lockdown', description: 'Strict timed exam — no going back, no hints' },
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
    labels: { pack: 'Pack', studyMode: 'Study Mode', retention: 'Retention', cardStyle: 'Card Style', complexity: 'Complexity' },
    studyModeOptions: [
      { value: 'flip', label: 'Flip', description: 'Classic card flip — tap to reveal the answer' },
      { value: 'type', label: 'Type', description: 'Type your answer before revealing the correct one' },
      { value: 'multiple-choice', label: 'Multiple Choice', description: 'Choose the correct answer from options' },
      { value: 'write', label: 'Write', description: 'Write the full answer from memory, then compare' },
      { value: 'speak', label: 'Speak', description: 'Say the answer out loud, then check yourself' },
      { value: 'match', label: 'Match', description: 'Match terms to definitions in a timed game' },
      { value: 'scatter', label: 'Scatter', description: 'Drag terms onto their matching definitions' },
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
      { value: 'exam', label: 'Lockdown', description: 'Strikt getimed examen — geen terug, geen hints' },
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
      { value: 'flip', label: 'Omdraaien', description: 'Klassiek kaart omdraaien — tik om te onthullen' },
      { value: 'type', label: 'Typen', description: 'Typ je antwoord voordat je het juiste ziet' },
      { value: 'multiple-choice', label: 'Meerkeuze', description: 'Kies het juiste antwoord uit opties' },
      { value: 'write', label: 'Schrijven', description: 'Schrijf het volledige antwoord uit je geheugen' },
      { value: 'speak', label: 'Spreken', description: 'Zeg het antwoord hardop en controleer jezelf' },
      { value: 'match', label: 'Koppelen', description: 'Koppel termen aan definities in een spel' },
      { value: 'scatter', label: 'Scatter', description: 'Sleep termen naar hun bijpassende definities' },
    ],
    packOptions: [
      { value: 'core', label: 'Kern', description: 'Essentiële termen en definities uit het materiaal' },
      { value: 'retention', label: 'Onthouden', description: 'Geoptimaliseerd voor langetermijngeheugen' },
      { value: 'exam', label: 'Examen', description: 'Examenstijl vragen met lastige afleiders' },
      { value: 'deep-dive', label: 'Diepgang', description: 'Genuanceerde kaarten over randgevallen' },
      { value: 'quick-review', label: 'Snel overzicht', description: 'Overzichtskaarten voor snelle herhaling' },
      { value: 'application', label: 'Toepassing', description: 'Pas concepten toe in de praktijk' },
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
      { value: 'core', label: 'Kern', description: 'Kernconcepten en hoofdideeën helder samengevat' },
      { value: 'exam', label: 'Examen', description: 'Examengericht met toetsbare feiten' },
      { value: 'reference', label: 'Referentie', description: 'Uitgebreid referentiemateriaal' },
      { value: 'lecture', label: 'College', description: 'Volgt de flow van een college' },
      { value: 'revision', label: 'Herhaling', description: 'Ultra-beknopte samenvattingen' },
      { value: 'research', label: 'Onderzoek', description: 'Academische stijl met bronnen' },
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
      { value: 'practice', label: 'Übung', description: 'Entspannter Modus mit Hinweisen und Erklärungen' },
      { value: 'normal', label: 'Normal', description: 'Standard-Quiz mit Punktzahl am Ende' },
      { value: 'exam', label: 'Prüfung', description: 'Strenge Zeitprüfung — kein Zurück, keine Hinweise' },
      { value: 'survival', label: 'Survival', description: 'Endlose Fragen bis zur ersten falschen Antwort' },
      { value: 'speedrun', label: 'Speedrun', description: 'So viele Antworten wie möglich im Zeitlimit' },
      { value: 'adaptive', label: 'Adaptiv', description: 'Schwierigkeit passt sich deiner Leistung an' },
      { value: 'boss-fight', label: 'Boss Fight', description: 'Eine extrem schwere mehrteilige Frage' },
      { value: 'duel', label: 'Duell', description: 'Tritt gegen einen KI-Gegner an' },
      { value: 'blitz', label: 'Blitz', description: '5-Sekunden-Timer pro Frage' },
      { value: 'reverse', label: 'Umgekehrt', description: 'Die Antwort ist gegeben, finde die Frage' },
      { value: 'elimination', label: 'Elimination', description: 'Falsche Antworten entfernen Optionen' },
    ],
    packOptions: [
      { value: 'practice', label: 'Übung', description: 'Leichtere Fragen zum Verständnis' },
      { value: 'exam', label: 'Prüfung', description: 'Strenge Fragen auf Prüfungsniveau' },
      { value: 'adaptive', label: 'Adaptiv', description: 'Mix aus Schwierigkeiten, der sich anpasst' },
      { value: 'deep-dive', label: 'Tiefgang', description: 'Fokussiert auf Randfälle und Nuancen' },
      { value: 'rapid-review', label: 'Schnellüberblick', description: 'Schnelle Fragen über breite Themen' },
      { value: 'application', label: 'Anwendung', description: 'Szenariobasierte Praxisfragen' },
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
    feedbackOptions: en.quiz.feedbackOptions,
    gradingStrictnessOptions: en.quiz.gradingStrictnessOptions,
    spellingToleranceOptions: en.quiz.spellingToleranceOptions,
    partialCreditOptions: en.quiz.partialCreditOptions,
    gradingMethodOptions: en.quiz.gradingMethodOptions,
  },

  flashcards: { ...en.flashcards, generate: 'Karteikarten generieren', generatingTitle: 'Karteikarten generieren', createFlashcards: 'Karteikarten erstellen', parseError: 'Inhalt konnte nicht als Karteikarten erkannt werden.' },
  notes: { ...en.notes, generate: 'Notizen generieren', generatingTitle: 'Notizen generieren', parseError: 'Inhalt konnte nicht als Notizen erkannt werden.' },
};

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

  quiz: { ...en.quiz, generate: 'Générer le quiz', generatingTitle: 'Génération du quiz', createQuiz: 'Créer un quiz', parseError: 'Le contenu n\'a pas pu être reconnu comme un quiz.' },
  flashcards: { ...en.flashcards, generate: 'Générer les flashcards', generatingTitle: 'Génération des flashcards', createFlashcards: 'Créer des flashcards', parseError: 'Le contenu n\'a pas pu être reconnu comme des flashcards.' },
  notes: { ...en.notes, generate: 'Générer les notes', generatingTitle: 'Génération des notes', parseError: 'Le contenu n\'a pas pu être reconnu comme des notes.' },
};

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

  quiz: { ...en.quiz, generate: 'Generar quiz', generatingTitle: 'Generando quiz', createQuiz: 'Crear quiz', parseError: 'El contenido no pudo ser reconocido como un quiz.' },
  flashcards: { ...en.flashcards, generate: 'Generar flashcards', generatingTitle: 'Generando flashcards', createFlashcards: 'Crear flashcards', parseError: 'El contenido no pudo ser reconocido como flashcards.' },
  notes: { ...en.notes, generate: 'Generar notas', generatingTitle: 'Generando notas', parseError: 'El contenido no pudo ser reconocido como notas.' },
};

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

  quiz: { ...en.quiz, generate: 'Создать тест', generatingTitle: 'Создание теста', createQuiz: 'Создать тест', parseError: 'Содержимое не может быть распознано как тест.' },
  flashcards: { ...en.flashcards, generate: 'Создать карточки', generatingTitle: 'Создание карточек', createFlashcards: 'Создать карточки', parseError: 'Содержимое не может быть распознано как карточки.' },
  notes: { ...en.notes, generate: 'Создать заметки', generatingTitle: 'Создание заметок', parseError: 'Содержимое не может быть распознано как заметки.' },
};

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

  quiz: { ...en.quiz, generate: '生成测验', generatingTitle: '正在生成测验', createQuiz: '创建测验', parseError: '内容无法识别为测验。' },
  flashcards: { ...en.flashcards, generate: '生成闪卡', generatingTitle: '正在生成闪卡', createFlashcards: '创建闪卡', parseError: '内容无法识别为闪卡。' },
  notes: { ...en.notes, generate: '生成笔记', generatingTitle: '正在生成笔记', parseError: '内容无法识别为笔记。' },
};

const allStrings: Record<string, ToolStrings> = { en, nl, de, fr, es, ru, zh };

export function getToolStrings(locale: Locale): ToolStrings {
  return allStrings[locale] || en;
}

export type { ToolStrings };
