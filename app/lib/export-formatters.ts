import type { Quiz, QuizQuestion, Flashcard } from '@/lib/types';

// ── Quiz ──

export function quizToMarkdown(quiz: Quiz): string {
  const lines: string[] = ['# Quiz\n'];

  quiz.questions.forEach((q, i) => {
    lines.push(`## Question ${i + 1}`);
    lines.push(q.question);
    lines.push('');
    q.options.forEach((opt, j) => {
      const letter = String.fromCharCode(65 + j);
      lines.push(`${letter}. ${opt.text}`);
    });
    lines.push('');
  });

  lines.push('---\n## Answer Key\n');
  quiz.questions.forEach((q, i) => {
    const correctOpt = q.options.find(o => o.isCorrect);
    const answerIndex = correctOpt ? q.options.indexOf(correctOpt) : -1;
    const letter = answerIndex >= 0 ? String.fromCharCode(65 + answerIndex) : '?';
    lines.push(`${i + 1}. **${letter}** — ${correctOpt?.text || 'Unknown'}`);
  });

  return lines.join('\n');
}

export function quizToHtml(quiz: Quiz): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const questions = quiz.questions.map((q, i) => {
    const options = q.options.map((opt, j) => {
      const letter = String.fromCharCode(65 + j);
      return `<div class="option" data-letter="${letter}.">${opt.text}</div>`;
    }).join('');

    return `<div class="question-block">
      <div class="q-number">Question ${i + 1}</div>
      <div class="q-text">${q.question}</div>
      ${options}
    </div>`;
  }).join('');

  const answerKey = quiz.questions.map((q, i) => {
    const correctOpt = q.options.find(o => o.isCorrect);
    const answerIndex = correctOpt ? q.options.indexOf(correctOpt) : -1;
    const letter = answerIndex >= 0 ? String.fromCharCode(65 + answerIndex) : '?';
    return `<span class="answer-row">${i + 1}. ${letter}</span>`;
  }).join('');

  return `<div class="doc-header">
    <h1>Quiz</h1>
    <div class="meta">${quiz.questions.length} Questions · ${date}</div>
  </div>
  ${questions}
  <div class="answer-key">
    <h2>Answer Key</h2>
    <div>${answerKey}</div>
  </div>`;
}

// ── Flashcards ──

export function flashcardsToMarkdown(cards: Flashcard[]): string {
  const lines: string[] = ['# Flashcards\n'];

  cards.forEach((card, i) => {
    lines.push(`### Card ${i + 1}`);
    lines.push(`**Front:** ${card.front}`);
    lines.push(`**Back:** ${card.back}`);
    lines.push('');
  });

  return lines.join('\n');
}

export function flashcardsToHtml(cards: Flashcard[]): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const cardItems = cards.map((card) => `
    <div class="flashcard-item">
      <div class="term">${card.front}</div>
      <div class="definition">${card.back}</div>
    </div>
  `).join('');

  return `<div class="doc-header">
    <h1>Flashcards</h1>
    <div class="meta">${cards.length} Cards · ${date}</div>
  </div>
  <div class="flashcard-grid">${cardItems}</div>`;
}

// ── Notes ──

type NoteSection = { title: string; content: string | string[] };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineFormat(value: string) {
  return escapeHtml(value)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function markdownishToHtml(raw: string) {
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }

    const h3 = trimmed.match(/^###\s+(.+)/);
    const h2 = trimmed.match(/^##\s+(.+)/);
    const h1 = trimmed.match(/^#\s+(.+)/);
    const bullet = trimmed.match(/^[-*]\s+(.+)/);

    if (h3) {
      closeList();
      out.push(`<h3>${inlineFormat(h3[1])}</h3>`);
      continue;
    }
    if (h2) {
      closeList();
      out.push(`<h2>${inlineFormat(h2[1])}</h2>`);
      continue;
    }
    if (h1) {
      closeList();
      out.push(`<h2>${inlineFormat(h1[1])}</h2>`);
      continue;
    }
    if (bullet) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inlineFormat(bullet[1])}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${inlineFormat(trimmed)}</p>`);
  }

  closeList();
  return out.join('\n');
}

export function notesToMarkdown(notes: NoteSection[]): string {
  const lines: string[] = ['# Notes\n'];

  notes.forEach((section) => {
    lines.push(`## ${section.title}`);
    if (Array.isArray(section.content)) {
      section.content.forEach((item) => lines.push(`- ${item}`));
    } else {
      lines.push(section.content);
    }
    lines.push('');
  });

  return lines.join('\n');
}

export function notesToHtml(notes: NoteSection[]): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const sections = notes.map((section) => {
    let content: string;
    if (Array.isArray(section.content)) {
      content = '<ul>' + section.content.map((item) => `<li>${inlineFormat(String(item))}</li>`).join('') + '</ul>';
    } else {
      content = markdownishToHtml(String(section.content || ''));
    }

    return `<div class="note-section">
      <h2>${section.title}</h2>
      ${content}
    </div>`;
  }).join('');

  return `<div class="doc-header">
    <h1>Notes</h1>
    <div class="meta">${notes.length} Sections · ${date}</div>
  </div>
  ${sections}`;
}
