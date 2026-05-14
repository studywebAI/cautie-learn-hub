import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface GenerateMaterialsOptions {
  studysetName: string;
  materials: string;
  knowledgeLevel: string;
  studyDays: string[];
  workflowType: string;
  workflowSetting: string;
}

export interface Flashcard {
  question: string;
  answer: string;
  cloze?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface StudyGuide {
  title: string;
  summary: string;
  keyPoints: string[];
}

export interface GeneratedMaterials {
  flashcards: Flashcard[];
  quizzes: QuizQuestion[];
  studyGuide: StudyGuide;
}

export async function generateStudyMaterials(
  options: GenerateMaterialsOptions
): Promise<GeneratedMaterials> {
  const daysString = options.studyDays.length > 0
    ? options.studyDays.join(', ')
    : 'Flexible schedule';

  const prompt = `You are an expert educational content creator. Generate study materials for the following topic.

StudySet Name: ${options.studysetName}
Knowledge Level: ${options.knowledgeLevel}
Available Study Days: ${daysString}
Learning Style: ${options.workflowType} - ${options.workflowSetting}
Source Materials:
${options.materials}

Please generate study materials in the following JSON format ONLY (no markdown, no explanations):
{
  "flashcards": [
    {
      "question": "string",
      "answer": "string",
      "cloze": "optional string for cloze deletion",
      "difficulty": "easy|medium|hard"
    }
  ],
  "quizzes": [
    {
      "question": "string",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": 0,
      "difficulty": "easy|medium|hard"
    }
  ],
  "studyGuide": {
    "title": "string",
    "summary": "string (2-3 paragraphs)",
    "keyPoints": ["point1", "point2", "point3"]
  }
}

Generate 15 flashcards, 10 quiz questions, and 1 comprehensive study guide. Start with the JSON immediately.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as any).text)
      .join('');

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedMaterials;
    return parsed;
  } catch (error) {
    console.error('Error generating study materials:', error);
    throw error;
  }
}
