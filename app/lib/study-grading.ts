const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'of',
  'and',
  'or',
  'to',
  'in',
  'on',
  'for',
  'with',
]);

export const normalizeForCompare = (value: string): string => {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
};

const tokenize = (value: string): string[] => {
  return normalizeForCompare(value)
    .split(' ')
    .filter((word) => word && !STOP_WORDS.has(word));
};

const jaccardSimilarity = (a: string, b: string): number => {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
};

export const extractAnswerVariants = (answer: string): string[] => {
  const rawParts = answer
    .split(/\s*(?:\||;|\/|\bor\b|,)\s*/gi)
    .map((part) => part.trim())
    .filter(Boolean);
  const withOriginal = rawParts.length > 0 ? rawParts : [answer.trim()];
  return Array.from(new Set(withOriginal.map((part) => normalizeForCompare(part)).filter(Boolean)));
};

export const isTypedAnswerCorrect = (userInput: string, answer: string): boolean => {
  const normalizedUser = normalizeForCompare(userInput);
  if (!normalizedUser) return false;

  const answerVariants = extractAnswerVariants(answer);
  if (answerVariants.includes(normalizedUser)) return true;

  for (const variant of answerVariants) {
    if (!variant) continue;
    if (variant.includes(normalizedUser) || normalizedUser.includes(variant)) {
      if (Math.min(variant.length, normalizedUser.length) >= 4) return true;
    }

    const distance = levenshteinDistance(normalizedUser, variant);
    const maxLen = Math.max(normalizedUser.length, variant.length);
    const similarity = maxLen > 0 ? 1 - distance / maxLen : 0;
    if (similarity >= 0.84) return true;

    if (jaccardSimilarity(normalizedUser, variant) >= 0.74) return true;
  }
  return false;
};

