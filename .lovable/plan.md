

# Plan: Fix Build Errors for Vercel Deployment

## Overview
Your Next.js project has two categories of issues preventing Vercel deployment:

1. **Missing environment variables** - The code references `GEMINI_API_KEY` but no `.env.local` file exists
2. **Missing AI flow modules** - 16 AI flow files are imported but don't exist in `ai/flows/`

## What I'll Create

### 1. Environment Variables File (`.env.local`)
Create a `.env.local` file with all required environment variables:

```
# Gemini AI
GEMINI_API_KEY=AIzaSyD3QWViNg8XNS7va9Zt-OCCovSqn-7Q-TA

# Supabase (add your values)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
NEXTAUTH_URL=http://localhost:3000
```

> **Note**: After initial deployment, delete this key and add your real key through Vercel Dashboard → Settings → Environment Variables.

### 2. Missing AI Flow Stub Files (16 files)
Create stub files in `ai/flows/` so the build completes. Each stub exports a placeholder function that can be implemented later:

| File | Export |
|------|--------|
| `suggest-answers.ts` | `suggestAnswers` |
| `provide-ai-powered-analytics-teacher.ts` | `provideAiPoweredAnalyticsTeacher` |
| `provide-ai-powered-analytics-student.ts` | `provideAiPoweredAnalytics` |
| `process-material.ts` | `processMaterial` |
| `generate-teacher-dashboard-data.ts` | `generateTeacherDashboardData` |
| `generate-study-plan-from-task.ts` | `generateStudyPlanFromTask` |
| `generate-daily-schedule-recommendations.ts` | `generateDailyScheduleRecommendations` |
| `detect-schedule-conflicts.ts` | `detectScheduleConflicts` |
| `generate-single-question.ts` | `generateSingleQuestion` |
| `generate-single-flashcard.ts` | `generateSingleFlashcard` |
| `generate-quiz.ts` | `generateQuiz` |
| `generate-quiz-duel-data.ts` | `generateQuizDuelData` |
| `generate-personalized-study-plan.ts` | `generatePersonalizedStudyPlan` |
| `generate-notes.ts` | `generateNotes` |
| `generate-multiple-choice-from-flashcard.ts` | `generateMultipleChoiceFromFlashcard` |
| `generate-knowledge-graph.ts` | `generateKnowledgeGraph` |
| `generate-flashcards.ts` | `generateFlashcards` |
| `generate-class-ideas.ts` | `generateClassIdeas` |
| `modify-content.ts` | `modifyContent` |
| `explain-answer.ts` | `explainAnswer` |

Each stub will look like:
```typescript
'use server';

export async function flowName(input: any) {
  // TODO: Implement AI flow
  throw new Error('Flow not implemented yet');
}
```

---

## Technical Notes

### About the lucide-react ESM Errors
These errors (`TS1479`) appear in Lovable's preview because the preview environment treats files as CommonJS. However:
- **Your Next.js project is ESM** (uses `"type": "module"` implicitly with Next.js 16)
- **The `transpilePackages: ['lucide-react']` in next.config.ts** handles this correctly
- **This will NOT cause issues** when building on Vercel or locally

### After This Plan
Once I create these files:
1. Pull the changes locally: `git pull`
2. The build should complete successfully
3. Deploy to Vercel
4. Add your real API keys in Vercel Environment Variables
5. Delete the temporary key from `.env.local` or just don't commit it

