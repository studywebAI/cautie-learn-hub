const handcrafted = [
  'main causes that started World War I',
  'alliances and turning points in World War I',
  'timeline of events from the start of World War II',
  'how the Berlin Wall changed life in Europe',
  'organs of a dog and what each one does',
  'digestive system of a cat in simple words',
  'difference between arteries and veins with examples',
  'how insulin works in the human body',
  'mitosis versus meiosis with clear comparison',
  'photosynthesis explained with one real-life analogy',
  'Newton first law with daily life examples',
  'why the sky is blue in plain language',
  'steps to balance chemical equations quickly',
  'acid base reactions with easy practice problems',
  'the water cycle and why it matters for farming',
  'plate tectonics and major earthquake zones',
  'causes of inflation with real market examples',
  'supply and demand using coffee prices',
  'how compound interest grows over 10 years',
  'Pythagorean theorem with triangle word problems',
  'probability basics using dice and cards',
  'Shakespeare themes in Macbeth',
  'character growth in To Kill a Mockingbird',
  'French Revolution key events and outcomes',
  'Industrial Revolution effects on workers and cities',
  'civil rights movement milestones in the US',
  'cold war proxy conflicts overview',
  'Python loops and conditionals with beginner examples',
  'SQL joins explained with one school database',
  'binary search versus linear search',
  'stack versus queue in simple terms',
  'how DNS works when opening a website',
  'internet safety rules for students',
  'climate change evidence and common misconceptions',
  'greenhouse gases and energy balance',
  'renewable energy tradeoffs by source',
  'how vaccines train immune memory',
  'endocrine system glands and hormones',
  'kidney function and fluid balance',
  'causes and symptoms of dehydration',
  'map reading with scale and contour lines',
  'monsoon climate pattern in South Asia',
  'river erosion and landform creation',
  'ethical questions around AI in schools',
  'how to structure a persuasive paragraph',
  'strong thesis statement examples',
  'common grammar mistakes and quick fixes',
  'difference between metaphor and simile',
  'basic trigonometry identities and use cases',
  'how to solve linear equations step by step',
];

const actions = [
  'explain',
  'break down',
  'summarize',
  'compare',
  'map out',
  'outline',
  'clarify',
  'simplify',
  'analyze',
  'connect',
];

const topics = [
  'the causes of the fall of the Roman Empire',
  'how the printing press changed knowledge sharing',
  'ecosystems and food webs in wetlands',
  'carbon cycle interactions in forests',
  'electric circuits with series and parallel examples',
  'Ohm law with three practical calculations',
  'oxidation and reduction in batteries',
  'protein synthesis from DNA to ribosome',
  'human respiratory system and gas exchange',
  'statistical mean median mode with tricky datasets',
  'quadratic equations and graph interpretation',
  'slope intercept form from real world data',
  'fractions to percentages conversion shortcuts',
  'parts of a flower and pollination path',
  'difference between plant and animal cells',
  'types of government with country examples',
  'United Nations role in conflict resolution',
  'causes and consequences of deforestation',
  'sustainable farming methods and impact',
  'time complexity basics with code snippets',
  'recursion using factorial and Fibonacci examples',
  'TCP versus UDP for online games',
  'photosynthesis limiting factors in experiments',
  'human skeleton major bones and functions',
  'memory and learning models in psychology',
  'classical conditioning versus operant conditioning',
  'market structures perfect competition to monopoly',
  'opportunity cost in daily decisions',
  'supply chain bottlenecks and price spikes',
  'geometric proofs with clear reasoning steps',
  'proof by contradiction with one theorem',
  'language register formal versus informal writing',
  'critical reading strategy for dense articles',
  'poetry meter and rhyme scheme recognition',
  'rhetorical devices in political speeches',
  'colonial trade routes and economic motives',
  'causes of the Great Depression',
  'postwar reconstruction in Europe after 1945',
  'genetics Punnett squares with probability',
  'mutations and natural selection over generations',
  'volcano types and eruption behavior',
  'weather fronts and forecast interpretation',
  'cloud types and what they signal',
  'ocean currents and climate influence',
  'earth layers and seismic wave evidence',
];

const modifiers = [
  'using plain language',
  'for quick revision',
  'with one strong real-world example',
  'with a short timeline',
  'in concise bullet points',
  'step by step',
  'with common mistakes highlighted',
  'with mnemonic ideas',
  'with exam-style wording',
  'with definitions first',
  'with a cause-effect structure',
  'with comparison table style',
  'with a question-first approach',
  'with practice prompts at the end',
  'with a memory-friendly structure',
];

const endings = [
  'for tomorrow exam',
  'for a beginner student',
  'for grade 9 level',
  'for high school level',
  'for first-year university level',
  'for someone who missed the lesson',
  'for fast catch-up',
  'for strong conceptual understanding',
  'for oral test prep',
  'for written test prep',
];

const generated: string[] = [];

for (const action of actions) {
  for (const topic of topics) {
    for (const modifier of modifiers) {
      for (const ending of endings) {
        generated.push(`${action} ${topic} ${modifier} ${ending}`);
      }
    }
  }
}

const combined = [...handcrafted, ...generated];

// Fisher-Yates shuffle for non-pattern ordering
for (let i = combined.length - 1; i > 0; i -= 1) {
  const j = Math.floor(Math.random() * (i + 1));
  [combined[i], combined[j]] = [combined[j], combined[i]];
}

export const SOURCE_PLACEHOLDER_EXAMPLES = combined.slice(0, 1000);
