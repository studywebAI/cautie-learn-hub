'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-personalized-study-plan.ts';
import '@/ai/flows/provide-ai-powered-analytics-student.ts';
import '@/ai/flows/provide-ai-powered-analytics-teacher.ts';
import '@/ai/flows/process-material.ts';
import '@/ai/flows/generate-flashcards.ts';
import '@/ai/flows/generate-quiz.ts';
import '@/ai/flows/explain-answer.ts';
import '@/ai/flows/generate-single-question.ts';
import '@/ai/flows/generate-class-ideas.ts';
import '@/ai/flows/generate-quiz-duel-data.ts';
import '@/ai/flows/generate-single-flashcard.ts';
import '@/ai/flows/generate-multiple-choice-from-flashcard.ts';
import '@/ai/flows/generate-notes.ts';
import '@/ai/flows/generate-knowledge-graph.ts';
import '@/ai/flows/generate-study-plan-from-task.ts';
