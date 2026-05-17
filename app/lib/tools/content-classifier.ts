/**
 * Client-side content classifier.
 * Analyses raw source text and returns a classification object with y/n flags.
 * These flags drive which tool options are shown in the sidebar.
 * No AI cost or network latency — pure regex heuristics, runs instantly.
 */

export type ClassificationKey =
  | 'timeline'
  | 'dates'
  | 'people'
  | 'processes'
  | 'diagrams'
  | 'vocabulary'
  | 'code'
  | 'quotes'
  | 'sequential_plot';

export type ClassificationValue = 'y' | 'n';
export type ContentClassification = Record<ClassificationKey, ClassificationValue>;

/** Minimum text length before we attempt classification. */
const MIN_TEXT_LENGTH = 60;

export function classifyContent(text: string): ContentClassification | null {
  if (!text || text.trim().length < MIN_TEXT_LENGTH) return null;

  const t = text.toLowerCase();

  // ── Dates ──────────────────────────────────────────────────────────────────
  // Actual year numbers (3-4 digit), BC/AD/BCE/CE, "Nth century"
  const datesPresent =
    /\b\d{3,4}\b/.test(text) ||
    /\b(bc|ad|bce|ce)\b/i.test(text) ||
    /\b\d{1,2}(st|nd|rd|th)\s+century\b/i.test(text);

  // ── Timeline ───────────────────────────────────────────────────────────────
  // Sequential-events language, or temporal connectors + dates
  const timelinePresent =
    /\b(timeline|chronolog|sequence\s+of\s+events|era|period|century|decade|reign|dynasty|age\s+of)\b/.test(t) ||
    (datesPresent &&
      /\b(before|after|during|following|preceded|succeeded|eventually|subsequently|later|earlier)\b/.test(t));

  // ── People ─────────────────────────────────────────────────────────────────
  // At least one "FirstName LastName" pattern AND biographical verbs
  const peoplePresent =
    /[A-Z][a-z]+ [A-Z][a-z]+/.test(text) &&
    /\b(born|died|invented|discovered|wrote|said|argued|founded|led|created|established|ruled|lived|developed)\b/.test(t);

  // ── Processes ─────────────────────────────────────────────────────────────
  // Numbered/lettered steps, procedural language, or "how to"
  const processesPresent =
    /\b(step \d|first[,. ]+\w|second[,. ]+\w|third[,. ]+\w|finally[,. ]|procedure|method\b|how to\b|in order to|you (must|need to|should))\b/.test(t) ||
    /^\s*\d+\.\s+\w/m.test(text);

  // ── Diagrams ───────────────────────────────────────────────────────────────
  // Visual/structural references common in science/tech material
  const diagramsPresent =
    /\b(diagram|chart|graph|figure|illustration|anatomy|cell|nucleus|membrane|organism|circuit|structure|layer|component|skeletal|organ)\b/.test(t);

  // ── Vocabulary ─────────────────────────────────────────────────────────────
  // Definition language, glossary-style content, or "word: definition" pattern
  const vocabularyPresent =
    /\b(means\b|refers to\b|is defined as\b|definition of\b|the term\b|vocabulary|glossary|terminology|denotes|signifies)\b/.test(t) ||
    /\b\w{3,}:\s+[A-Z]/.test(text);

  // ── Code ───────────────────────────────────────────────────────────────────
  // Actual programming syntax: needs structural chars AND language keywords
  const codePresent =
    /[{};]/.test(text) &&
    /\b(function|class|import|export|const|let|var|def|return|if\s*\(|else\s*\{|for\s*\(|while\s*\(|public\s+static|private\s+\w|interface\s+\w+|#include)\b/.test(t);

  // ── Quotes ─────────────────────────────────────────────────────────────────
  // Attributed speech or cited passages (20+ chars inside quotes)
  const quotesPresent =
    /"[^"]{20,}"/.test(text) ||
    /\b(said[,:]?|stated[,:]?|argued[,:]?|wrote[,:]?|according to|as noted by|in the words of)\b/.test(t);

  // ── Sequential plot ────────────────────────────────────────────────────────
  // Narrative / literary content
  const sequentialPlotPresent =
    /\b(chapter|scene|act \d|protagonist|antagonist|plot|subplot|story|narrative|character|novel|poem|play|author|setting|conflict|resolution|climax|exposition)\b/.test(t);

  return {
    timeline: timelinePresent ? 'y' : 'n',
    dates: datesPresent ? 'y' : 'n',
    people: peoplePresent ? 'y' : 'n',
    processes: processesPresent ? 'y' : 'n',
    diagrams: diagramsPresent ? 'y' : 'n',
    vocabulary: vocabularyPresent ? 'y' : 'n',
    code: codePresent ? 'y' : 'n',
    quotes: quotesPresent ? 'y' : 'n',
    sequential_plot: sequentialPlotPresent ? 'y' : 'n',
  };
}

/**
 * Returns true when a given quiz type is available for the provided classification.
 * Pass null to show all types (before content is classified).
 */
export function isQuizTypeAvailable(
  typeValue: string,
  cls: ContentClassification | null
): boolean {
  if (!cls) return true;
  if (typeValue === 'timeline' && cls.timeline === 'n') return false;
  if (typeValue === 'ordering' && cls.processes === 'n' && cls.sequential_plot === 'n') return false;
  return true;
}
