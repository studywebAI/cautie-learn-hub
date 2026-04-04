type ToolPlaceholderId = 'notes' | 'quiz' | 'flashcards' | 'presentation';

const buildPool = (parts: {
  intents: string[];
  topics: string[];
  styles: string[];
  audiences: string[];
  constraints: string[];
}) => {
  const out: string[] = [];
  for (const intent of parts.intents) {
    for (const topic of parts.topics) {
      for (const style of parts.styles) {
        for (const audience of parts.audiences) {
          for (const constraint of parts.constraints) {
            out.push(`${intent} ${topic} ${style} ${audience} ${constraint}`.replace(/\s+/g, ' ').trim());
          }
        }
      }
    }
  }
  return Array.from(new Set(out));
};

const NOTES_TOPICS = [
  'the start of WW1',
  'the causes of the Great Depression',
  'cell respiration and ATP production',
  'organs of a dog and their function',
  'plate tectonics and earthquake zones',
  'supply and demand with coffee prices',
  'DNA replication and mutation types',
  'photosynthesis in C3 vs C4 plants',
  'the French Revolution timeline',
  'Shakespeare themes in Macbeth',
  'SQL joins with school database examples',
  'Ohm law with practical circuits',
];

const QUIZ_TOPICS = [
  'WW2 turning points and alliances',
  'human endocrine system hormones',
  'probability with dice and cards',
  'acid base reactions in chemistry',
  'colonial trade routes and motives',
  'kidney function and filtration',
  'linear equations from word problems',
  'internet safety and phishing',
  'weather fronts and forecast clues',
  'operant vs classical conditioning',
  'market structures and competition',
  'ecosystems and food webs',
];

const FLASHCARD_TOPICS = [
  'major events leading to WW1',
  'anatomy terms for the canine digestive system',
  'key formulas for basic trigonometry',
  'Python data structures and use cases',
  'French Revolution key names and dates',
  'cardiology terms: arteries vs veins',
  'cell cycle phases and checkpoints',
  'geography capitals and landmark facts',
  'supply chain terms and definitions',
  'biochemistry enzymes and substrates',
  'rhetorical devices with examples',
  'constitutional law core concepts',
];

const PRESENTATION_TOPICS = [
  'the causes and impact of WW1',
  'dog organ systems for vet basics',
  'intro to climate change evidence',
  'how insulin works in the body',
  'French Revolution in 8 milestones',
  'plate tectonics and volcano types',
  'internet protocol layers explained',
  'market inflation and interest rates',
  'photosynthesis and cellular respiration',
  'DNA to protein process flow',
  'ethical AI use in schools',
  'sustainable farming techniques',
];

const notesPool = buildPool({
  intents: [
    'make clean study notes on',
    'create structured lecture notes for',
    'summarize class material about',
    'turn this topic into clear notes on',
    'write revision notes about',
  ],
  topics: NOTES_TOPICS,
  styles: [
    'in bullet points',
    'with short section headers',
    'with concept-first structure',
    'with examples and definitions',
    'with cause and effect grouping',
  ],
  audiences: [
    'for high school',
    'for first-year university',
    'for exam revision',
    'for someone who missed class',
  ],
  constraints: [
    'keep it concise',
    'include common mistakes',
    'add memory hooks',
  ],
});

const quizPool = buildPool({
  intents: [
    'generate mixed-difficulty questions on',
    'create a timed practice set for',
    'build exam-style questions about',
    'make a checkpoint test for',
    'write concept-check questions on',
  ],
  topics: QUIZ_TOPICS,
  styles: [
    'with multiple choice and short answer',
    'with increasing difficulty',
    'with one scenario question per section',
    'with trick-vs-core balance',
    'with clear answer keys',
  ],
  audiences: [
    'for high school level',
    'for first-year university',
    'for final exam prep',
    'for weekly revision',
  ],
  constraints: [
    'focus on weak spots',
    'avoid duplicate wording',
    'prioritize conceptual understanding',
  ],
});

const flashcardsPool = buildPool({
  intents: [
    'create term-definition cards for',
    'build recall cards from',
    'generate active-recall prompts about',
    'make quick revision cards on',
    'convert this into memory cards for',
  ],
  topics: FLASHCARD_TOPICS,
  styles: [
    'with concise backs',
    'with one clue per card',
    'with easy-to-hard progression',
    'with misconception checks',
    'with clear keyword emphasis',
  ],
  audiences: [
    'for exam week',
    'for beginner learners',
    'for intermediate level',
    'for rapid daily review',
  ],
  constraints: [
    'avoid duplicates',
    'keep each prompt specific',
    'include only testable facts',
  ],
});

const presentationPool = buildPool({
  intents: [
    'outline a slide deck on',
    'create a presentation narrative for',
    'turn this topic into a talk on',
    'build a lesson deck about',
    'draft a classroom presentation for',
  ],
  topics: PRESENTATION_TOPICS,
  styles: [
    'with a clear opener-body-close flow',
    'with one key point per slide',
    'with examples then summary',
    'with timeline and key takeaways',
    'with comparison and conclusion',
  ],
  audiences: [
    'for a 5-minute class presentation',
    'for a 10-minute student talk',
    'for an introductory lesson',
    'for exam recap session',
  ],
  constraints: [
    'keep language simple',
    'include speaker cue notes',
    'add a short Q&A slide',
  ],
});

const take250 = (pool: string[]) => pool.slice(0, 250);

export const SOURCE_PLACEHOLDER_EXAMPLES_BY_TOOL: Record<ToolPlaceholderId, string[]> = {
  notes: take250(notesPool),
  quiz: take250(quizPool),
  flashcards: take250(flashcardsPool),
  presentation: take250(presentationPool),
};

export const SOURCE_PLACEHOLDER_EXAMPLES = [
  ...SOURCE_PLACEHOLDER_EXAMPLES_BY_TOOL.notes,
  ...SOURCE_PLACEHOLDER_EXAMPLES_BY_TOOL.quiz,
  ...SOURCE_PLACEHOLDER_EXAMPLES_BY_TOOL.flashcards,
  ...SOURCE_PLACEHOLDER_EXAMPLES_BY_TOOL.presentation,
];
