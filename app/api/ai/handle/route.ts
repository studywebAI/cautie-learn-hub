// app/api/ai/handle/route.ts

// Safe lazy dynamic-loader definitions:
const flowMap: Record<
  string,
  () => Promise<(input: any) => Promise<any> | any>
> = {
  suggestAnswers: () =>
    import("@/ai/flows/suggest-answers").then(m => m.suggestAnswers),

  provideAiPoweredAnalyticsTeacher: () =>
    import("@/ai/flows/provide-ai-powered-analytics-teacher")
      .then(m => m.provideAiPoweredAnalyticsTeacher),

  provideAiPoweredAnalyticsStudent: () =>
    import("@/ai/flows/provide-ai-powered-analytics-student")
      .then(m => m.provideAiPoweredAnalytics),

  processMaterial: () =>
    import("@/ai/flows/process-material").then(m => m.processMaterial),

  generateTeacherDashboardData: () =>
    import("@/ai/flows/generate-teacher-dashboard-data")
      .then(m => m.generateTeacherDashboardData),

  generateStudyPlanFromTask: () =>
    import("@/ai/flows/generate-study-plan-from-task")
      .then(m => m.generateStudyPlanFromTask),

  generateDailyScheduleRecommendations: () =>
    import("@/ai/flows/generate-daily-schedule-recommendations")
      .then(m => m.generateDailyScheduleRecommendations),

  detectScheduleConflicts: () =>
    import("@/ai/flows/detect-schedule-conflicts")
      .then(m => m.detectScheduleConflicts),

  generateSingleQuestion: () =>
    import("@/ai/flows/generate-single-question")
      .then(m => m.generateSingleQuestion),

  generateSingleFlashcard: () =>
    import("@/ai/flows/generate-single-flashcard")
      .then(m => m.generateSingleFlashcard),

  generateQuiz: () =>
    import("@/ai/flows/generate-quiz").then(m => m.generateQuiz),

  generateQuizDuelData: () =>
    import("@/ai/flows/generate-quiz-duel-data")
      .then(m => m.generateQuizDuelData),

  generatePersonalizedStudyPlan: () =>
    import("@/ai/flows/generate-personalized-study-plan")
      .then(m => m.generatePersonalizedStudyPlan),

  generateNotes: () =>
    import("@/ai/flows/generate-notes").then(m => m.generateNotes),

  generateMultipleChoiceFromFlashcard: () =>
    import("@/ai/flows/generate-multiple-choice-from-flashcard")
      .then(m => m.generateMultipleChoiceFromFlashcard),

  generateKnowledgeGraph: () =>
    import("@/ai/flows/generate-knowledge-graph")
      .then(m => m.generateKnowledgeGraph),

  generateFlashcards: () =>
    import("@/ai/flows/generate-flashcards").then(m => m.generateFlashcards),

  generateClassIdeas: () =>
    import("@/ai/flows/generate-class-ideas").then(m => m.generateClassIdeas),

  gradeOpenQuestion: () =>
    import("@/ai/flows/grade-open-question").then(m => m.gradeOpenQuestion),

  modifyContent: () =>
    import("@/ai/flows/modify-content").then(m => m.modifyContent),

  explainAnswer: () =>
    import("@/ai/flows/explain-answer").then(m => m.explainAnswer),
};

export async function POST(req: Request) {
  try {
    const { flowName, input } = await req.json();

    if (!flowName || typeof flowName !== "string") {
      return Response.json({ error: "Missing or invalid flowName" }, { status: 400 });
    }

    const loader = flowMap[flowName];

    if (!loader) {
      return Response.json({ error: `Flow '${flowName}' not found` }, { status: 404 });
    }

    let flow;
    try {
      flow = await loader();
    } catch (err: any) {
      console.error("Flow import failed:", err);
      const isMissingKey = err.message?.includes("Missing GEMINI_API_KEY");
      return Response.json(
        { 
            error: isMissingKey ? "AI Configuration Missing" : "Failed to import flow", 
            detail: err?.message,
            code: isMissingKey ? "MISSING_API_KEY" : "INTERNAL_ERROR"
        },
        { status: isMissingKey ? 503 : 500 }
      );
    }

    if (typeof flow !== "function") {
      return Response.json(
        { error: "Imported flow is not a function" },
        { status: 500 }
      );
    }

    try {
      const result = await flow(input);
      return Response.json(result);
    } catch (err: any) {
      console.error(`Flow execution error for ${flowName}:`, err.message, err.stack);
      return Response.json(
        {
          error: err?.message || "Flow execution failed",
          flowName,
          ...(process.env.NODE_ENV === "development" && { stack: err?.stack }),
        },
        { status: 500 }
      );
    }
  } catch (err: any) {
    return Response.json(
      {
        error: err?.message || "Unknown server error",
        ...(process.env.NODE_ENV === "development" && { stack: err?.stack }),
      },
      { status: 500 }
    );
  }
}
