type FlowHandler = (input: any) => Promise<any> | any;

const SOURCE_GROUNDED_FLOWS = new Set(["generateNotes", "generateQuiz", "generateFlashcards"]);
const SOURCE_GROUNDING_INSTRUCTION = [
  "Grounding requirements:",
  "- Use only facts present in the provided source content (text, imported links, extracted files/captions).",
  "- Do not invent missing details, names, dates, formulas, or examples.",
  "- If information is missing, keep the output general and avoid guessing.",
  "- Do not use external or prior knowledge beyond the provided source content.",
].join("\n");

const flowMap: Record<string, () => Promise<FlowHandler>> = {
  suggestAnswers: () =>
    import("@/ai/flows/suggest-answers").then((m) => m.suggestAnswers),
  provideAiPoweredAnalyticsTeacher: () =>
    import("@/ai/flows/provide-ai-powered-analytics-teacher").then(
      (m) => m.provideAiPoweredAnalyticsTeacher
    ),
  provideAiPoweredAnalyticsStudent: () =>
    import("@/ai/flows/provide-ai-powered-analytics-student").then(
      (m) => m.provideAiPoweredAnalytics
    ),
  processMaterial: () =>
    import("@/ai/flows/process-material").then((m) => m.processMaterial),
  generateTeacherDashboardData: () =>
    import("@/ai/flows/generate-teacher-dashboard-data").then(
      (m) => m.generateTeacherDashboardData
    ),
  generateStudyPlanFromTask: () =>
    import("@/ai/flows/generate-study-plan-from-task").then(
      (m) => m.generateStudyPlanFromTask
    ),
  generateDailyScheduleRecommendations: () =>
    import("@/ai/flows/generate-daily-schedule-recommendations").then(
      (m) => m.generateDailyScheduleRecommendations
    ),
  detectScheduleConflicts: () =>
    import("@/ai/flows/detect-schedule-conflicts").then(
      (m) => m.detectScheduleConflicts
    ),
  generateSingleQuestion: () =>
    import("@/ai/flows/generate-single-question").then(
      (m) => m.generateSingleQuestion
    ),
  generateSingleFlashcard: () =>
    import("@/ai/flows/generate-single-flashcard").then(
      (m) => m.generateSingleFlashcard
    ),
  generateQuiz: () =>
    import("@/ai/flows/generate-quiz").then((m) => m.generateQuiz),
  generateQuizDuelData: () =>
    import("@/ai/flows/generate-quiz-duel-data").then(
      (m) => m.generateQuizDuelData
    ),
  generatePersonalizedStudyPlan: () =>
    import("@/ai/flows/generate-personalized-study-plan").then(
      (m) => m.generatePersonalizedStudyPlan
    ),
  generateNotes: () =>
    import("@/ai/flows/generate-notes").then((m) => m.generateNotes),
  generateMultipleChoiceFromFlashcard: () =>
    import("@/ai/flows/generate-multiple-choice-from-flashcard").then(
      (m) => m.generateMultipleChoiceFromFlashcard
    ),
  generateKnowledgeGraph: () =>
    import("@/ai/flows/generate-knowledge-graph").then(
      (m) => m.generateKnowledgeGraph
    ),
  generateFlashcards: () =>
    import("@/ai/flows/generate-flashcards").then((m) => m.generateFlashcards),
  generateClassIdeas: () =>
    import("@/ai/flows/generate-class-ideas").then((m) => m.generateClassIdeas),
  gradeOpenQuestion: () =>
    import("@/ai/flows/grade-open-question").then((m) => m.gradeOpenQuestion),
  modifyContent: () =>
    import("@/ai/flows/modify-content").then((m) => m.modifyContent),
  explainAnswer: () =>
    import("@/ai/flows/explain-answer").then((m) => m.explainAnswer),
};

export function getSupportedFlows() {
  return Object.keys(flowMap);
}

export async function executeAIFlow(flowName: string, input: any) {
  const loader = flowMap[flowName];
  if (!loader) {
    throw new Error(`Flow '${flowName}' not found`);
  }

  const flow = await loader();
  if (typeof flow !== "function") {
    throw new Error("Imported flow is not a function");
  }

  const enrichedInput =
    SOURCE_GROUNDED_FLOWS.has(flowName) && input && typeof input === "object"
      ? { ...input, groundingInstruction: SOURCE_GROUNDING_INSTRUCTION }
      : input;

  return flow(enrichedInput);
}
