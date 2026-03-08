import type { Quiz, QuizQuestion, QuizOption, Flashcard } from '@/lib/types';

type NoteSection = { title: string; content: string | string[] };

/**
 * Parse markdown (from our export format) back into interactive tool data.
 */

// ── Quiz ──

export function parseQuizFromMarkdown(text: string): Quiz | null {
  try {
    const questions: QuizQuestion[] = [];
    // Match question blocks: ## Question N\n<text>\n<options>
    const questionPattern = /##\s*Question\s*(\d+)\s*\n([\s\S]*?)(?=##\s*Question\s*\d+|---|\n##\s*Answer|$)/gi;
    const answerKeyPattern = /##\s*Answer\s*Key\s*\n([\s\S]*?)$/i;

    // Extract answer key first
    const answerKeyMatch = answerKeyPattern.exec(text);
    const answers: Record<number, string> = {};
    if (answerKeyMatch) {
      const keyLines = answerKeyMatch[1].trim().split('\n');
      for (const line of keyLines) {
        const m = line.match(/(\d+)\.\s*\*?\*?([A-Z])\*?\*?\s*[—–-]/);
        if (m) answers[parseInt(m[1])] = m[2];
      }
    }

    let match;
    while ((match = questionPattern.exec(text)) !== null) {
      const qNum = parseInt(match[1]);
      const block = match[2].trim();
      const lines = block.split('\n').filter(l => l.trim());

      // First line(s) before options are the question text
      const optionLines: string[] = [];
      const questionLines: string[] = [];

      for (const line of lines) {
        if (/^[A-Z]\.\s/.test(line.trim())) {
          optionLines.push(line.trim());
        } else {
          questionLines.push(line.trim());
        }
      }

      const questionText = questionLines.join(' ');
      const correctLetter = answers[qNum];

      const options: QuizOption[] = optionLines.map((optLine, j) => {
        const letter = String.fromCharCode(65 + j);
        const optText = optLine.replace(/^[A-Z]\.\s*/, '');
        return {
          id: letter.toLowerCase(),
          text: optText,
          isCorrect: letter === correctLetter,
        };
      });

      // If no answer key, mark first as correct (fallback)
      if (!correctLetter && options.length > 0) {
        options[0].isCorrect = true;
      }

      questions.push({
        id: `q-${qNum}`,
        question: questionText,
        options,
      });
    }

    if (questions.length === 0) return null;

    return {
      title: 'Imported Quiz',
      description: `${questions.length} questions`,
      questions,
    };
  } catch {
    return null;
  }
}

// ── Flashcards ──

export function parseFlashcardsFromMarkdown(text: string): Flashcard[] | null {
  try {
    const cards: Flashcard[] = [];

    // Pattern 1: ### Card N\n**Front:** ...\n**Back:** ...
    const cardPattern = /###\s*Card\s*\d+\s*\n\*\*Front:\*\*\s*(.*?)\n\*\*Back:\*\*\s*(.*?)(?=\n###|\n#|$)/gis;
    let match;
    while ((match = cardPattern.exec(text)) !== null) {
      const front = match[1].trim();
      const back = match[2].trim();
      cards.push({
        id: `card-${cards.length + 1}`,
        front,
        back,
        cloze: front.replace(new RegExp(back.split(' ')[0], 'i'), '____'),
      });
    }

    if (cards.length > 0) return cards;

    // Pattern 2: Term/Definition separated by tabs or " - " or " — "
    const lines = text.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const parts = line.split(/\t|(?:\s[—–-]\s)/);
      if (parts.length >= 2) {
        const front = parts[0].trim();
        const back = parts.slice(1).join(' ').trim();
        cards.push({
          id: `card-${cards.length + 1}`,
          front,
          back,
          cloze: `${front.replace(new RegExp(back.split(' ')[0], 'i'), '____')}`,
        });
      }
    }

    return cards.length > 0 ? cards : null;
  } catch {
    return null;
  }
}

// ── Notes ──

export function parseNotesFromMarkdown(text: string): NoteSection[] | null {
  try {
    const sections: NoteSection[] = [];
    // Split by ## headings
    const sectionPattern = /##\s+(.*?)\n([\s\S]*?)(?=\n##\s|$)/g;
    let match;
    while ((match = sectionPattern.exec(text)) !== null) {
      const title = match[1].trim();
      const body = match[2].trim();

      // Check if content is bullet points
      const bulletLines = body.split('\n').filter(l => /^[-•*]\s/.test(l.trim()));
      if (bulletLines.length > 0 && bulletLines.length >= body.split('\n').filter(l => l.trim()).length * 0.5) {
        sections.push({
          title,
          content: bulletLines.map(l => l.replace(/^[-•*]\s*/, '').trim()),
        });
      } else {
        sections.push({ title, content: body });
      }
    }

    return sections.length > 0 ? sections : null;
  } catch {
    return null;
  }
}

// ── HTML parsing (from our download format) ──

export function parseQuizFromHtml(html: string): Quiz | null {
  // Strip HTML tags and convert to markdown-like text, then parse
  const text = htmlToText(html);
  return parseQuizFromMarkdown(text);
}

export function parseFlashcardsFromHtml(html: string): Flashcard[] | null {
  const text = htmlToText(html);
  return parseFlashcardsFromMarkdown(text);
}

export function parseNotesFromHtml(html: string): NoteSection[] | null {
  const text = htmlToText(html);
  return parseNotesFromMarkdown(text);
}

function htmlToText(html: string): string {
  return html
    .replace(/<div class="doc-header">[\s\S]*?<\/div>/gi, '')
    .replace(/<div class="q-number">(.*?)<\/div>/gi, '## $1')
    .replace(/<div class="q-text">(.*?)<\/div>/gi, '$1')
    .replace(/<div class="option" data-letter="([A-Z])\.">(.*?)<\/div>/gi, '$1. $2')
    .replace(/<div class="term">(.*?)<\/div>/gi, '**Front:** $1')
    .replace(/<div class="definition">(.*?)<\/div>/gi, '**Back:** $1')
    .replace(/<div class="flashcard-item">/gi, '### Card')
    .replace(/<h2>(.*?)<\/h2>/gi, '## $1')
    .replace(/<h1>(.*?)<\/h1>/gi, '# $1')
    .replace(/<li>(.*?)<\/li>/gi, '- $1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|span|ul|ol|strong|em|section|article)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
