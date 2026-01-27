import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GradingResult {
  score: number;
  feedback: string;
}

export async function gradeOpenQuestion(
  question: string,
  criteria: string,
  maxScore: number,
  language: string,
  studentAnswer: string
): Promise<GradingResult> {
  const prompt = `🔴 AI GRADING SYSTEM PROMPT (COPY PASTE)

You are an automated grading engine for an educational platform.

Your task:
- Grade a student's open-ended answer objectively.
- Follow the grading criteria exactly.
- Be strict but fair.
- Do NOT hallucinate facts.
- Do NOT add information not present in the student's answer.

Rules:
- You MUST return valid JSON only.
- You MUST follow the exact output schema.
- Do NOT include explanations outside the JSON.
- Do NOT include markdown.
- Do NOT include comments.
- Do NOT include the student's answer in the output.
- If the answer is empty or irrelevant, score 0.

Grading rules:
- Score must be an integer.
- Score range is 0 to max_score.
- Use the full range when appropriate.
- Partial credit is allowed.
- Feedback must be written in the same language as the question.

Tone of feedback:
- Clear
- Educational
- Neutral
- Short (1–4 sentences)

If the answer is incorrect:
- Explain what is missing or wrong.
- Do not shame the student.

If the answer is correct:
- Briefly confirm correctness.
- Optionally suggest improvement.

You are NOT allowed to refuse grading.
You are NOT allowed to say "I cannot determine".
You are NOT allowed to ask questions.

Return JSON ONLY.

🟢 AI GRADING USER PROMPT (DYNAMIC PAYLOAD)

QUESTION:
${question}

GRADING CRITERIA:
${criteria}

MAX SCORE:
${maxScore}

LANGUAGE:
${language}

STUDENT ANSWER:
${studentAnswer}

🟣 VERPLICHT OUTPUT SCHEMA

AI MOET exact dit teruggeven:

{
  "score": 0,
  "feedback": ""
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const result: GradingResult = JSON.parse(content);

    // Validate
    if (typeof result.score !== 'number' || typeof result.feedback !== 'string') {
      throw new Error('Invalid AI response format');
    }

    if (result.score < 0 || result.score > maxScore) {
      throw new Error('Score out of range');
    }

    return result;
  } catch (error) {
    console.error('AI grading error:', error);
    // Fallback: return 0 score with error feedback
    return {
      score: 0,
      feedback: 'Unable to grade automatically. Please contact your teacher.',
    };
  }
}