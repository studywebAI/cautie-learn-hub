const subjects = [
  'biology',
  'chemistry',
  'physics',
  'history',
  'geography',
  'math',
  'economics',
  'programming',
  'literature',
  'psychology',
];

const goals = [
  'create flashcards',
  'build a quiz',
  'summarize notes',
  'explain key ideas',
  'prepare a presentation',
];

const audiences = [
  'for middle school',
  'for high school',
  'for university',
  'for exam revision',
  'for beginners',
];

const tones = ['simple', 'academic', 'professional', 'fun'];

const EXAMPLES: string[] = [];

for (const subject of subjects) {
  for (const goal of goals) {
    for (const audience of audiences) {
      for (const tone of tones) {
        EXAMPLES.push(`${goal} on ${subject} ${audience} in a ${tone} tone`);
      }
    }
  }
}

export const SOURCE_PLACEHOLDER_EXAMPLES = EXAMPLES.slice(0, 1000);
