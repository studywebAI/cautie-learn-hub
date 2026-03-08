import type { Quiz, QuizQuestion, Flashcard } from '@/lib/types';

// ── Quiz ──

export function quizToMarkdown(quiz: Quiz): string {
  const lines: string[] = ['# Quiz\n'];

  quiz.questions.forEach((q: QuizQuestion, i: number) => {
    lines.push(`## Question ${i + 1}`);
    lines.push(q.question);
    lines.push('');
    q.options.forEach((opt: string, j: number) => {
      const letter = String.fromCharCode(65 + j);
      lines.push(`${letter}. ${opt}`);
    });
    lines.push('');
  });

  lines.push('---\n## Answer Key\n');
  quiz.questions.forEach((q: QuizQuestion, i: number) => {
    const answerIndex = q.options.indexOf(q.correctAnswer);
    const letter = answerIndex >= 0 ? String.fromCharCode(65 + answerIndex) : '?';
    lines.push(`${i + 1}. **${letter}** — ${q.correctAnswer}`);
  });

  return lines.join('\n');
}

export function quizToHtml(quiz: Quiz): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const questions = quiz.questions.map((q: QuizQuestion, i: number) => {
    const options = q.options.map((opt: string, j: number) => {
      const letter = String.fromCharCode(65 + j);
      return `<div class="option" data-letter="${letter}.">${opt}</div>`;
    }).join('');

    return `<div class="question-block">
      <div class="q-number">Question ${i + 1}</div>
      <div class="q-text">${q.question}</div>
      ${options}
    </div>`;
  }).join('');

  const answerKey = quiz.questions.map((q: QuizQuestion, i: number) => {
    const answerIndex = q.options.indexOf(q.correctAnswer);
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
      content = '<ul>' + section.content.map((item) => `<li>${item}</li>`).join('') + '</ul>';
    } else {
      // Convert markdown-ish content to basic HTML
      content = section.content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br/>');
      content = `<p>${content}</p>`;
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
