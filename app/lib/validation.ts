/**
 * Zod validation schemas for API inputs
 * Use these to validate and sanitize all incoming request data
 */

import { z } from 'zod';

// ============================================
// Common field schemas
// ============================================

/** Validate title fields (1-500 chars) */
export const titleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(500, 'Title must be less than 500 characters')
  .trim();

/** Validate description fields (0-5000 chars) */
export const descriptionSchema = z
  .string()
  .max(5000, 'Description must be less than 5000 characters')
  .trim();

/** Validate content fields (0-50000 chars) */
export const contentSchema = z
  .string()
  .max(50000, 'Content must be less than 50000 characters')
  .trim();

/** Validate HTML content with sanitization needs */
export const htmlContentSchema = z
  .string()
  .max(100000, 'HTML content is too large')
  .trim();

/** Validate numeric IDs */
export const numericIdSchema = z
  .number()
  .int()
  .positive('ID must be a positive integer');

/** Validate UUIDs */
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

/** Validate email addresses */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email is too long');

/** Validate URLs */
export const urlSchema = z
  .string()
  .url('Invalid URL')
  .max(2000, 'URL is too long');

/** Validate non-negative numbers (for weights, scores, etc.) */
export const nonNegativeNumberSchema = z
  .number()
  .nonnegative('Value must be non-negative')
  .finite('Value must be finite');

// ============================================
// API Request Schemas
// ============================================

/** Schema for creating/updating grades */
export const gradeUpsertSchema = z.object({
  title: titleSchema,
  weight: nonNegativeNumberSchema.optional(),
  score: nonNegativeNumberSchema.optional(),
});

/** Schema for material/studyset content */
export const materialContentSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  content: contentSchema.optional(),
});

/** Schema for assignment creation/update */
export const assignmentSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  content: contentSchema.optional(),
  dueDate: z.string().datetime().optional(),
  classId: uuidSchema.optional(),
});

/** Schema for quiz questions */
export const quizQuestionSchema = z.object({
  question: contentSchema,
  options: z
    .array(contentSchema)
    .min(2, 'Question must have at least 2 options')
    .max(10, 'Question can have at most 10 options'),
  correctOptionIndex: z
    .number()
    .int()
    .nonnegative(),
  explanation: contentSchema.optional(),
});

/** Schema for quiz creation */
export const quizSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  questions: z
    .array(quizQuestionSchema)
    .min(1, 'Quiz must have at least 1 question')
    .max(100, 'Quiz can have at most 100 questions'),
});

/** Schema for flashcard creation */
export const flashcardSchema = z.object({
  term: titleSchema,
  definition: contentSchema,
  examples: contentSchema.optional(),
  pronunciation: z.string().max(200).optional(),
});

/** Schema for flashcard set */
export const flashcardSetSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  cards: z
    .array(flashcardSchema)
    .min(1, 'Set must have at least 1 card')
    .max(1000, 'Set can have at most 1000 cards'),
});

/** Schema for text/note content */
export const noteContentSchema = z.object({
  content: contentSchema,
  format: z.enum(['text', 'html', 'markdown']).optional(),
});

/** Schema for media/embed blocks */
export const mediaEmbedSchema = z.object({
  embedUrl: urlSchema,
  description: descriptionSchema.optional(),
  title: titleSchema.optional(),
});

/** Schema for rich text blocks */
export const richTextBlockSchema = z.object({
  html: htmlContentSchema,
  plainText: contentSchema.optional(),
});

/** Schema for simple text blocks */
export const simpleTextBlockSchema = z.object({
  content: contentSchema,
  style: z.enum(['normal', 'heading', 'subheading', 'quote', 'note', 'warning']).optional(),
});

/** Schema for generic block updates */
export const blockUpdateSchema = z.object({
  type: z.string().min(1).max(50),
  data: z.record(z.any()),
});

/** Schema for class announcements */
export const announcementSchema = z.object({
  title: titleSchema,
  content: contentSchema,
  classId: uuidSchema,
  published: z.boolean().optional(),
});

/** Schema for attendance records */
export const attendanceSchema = z.object({
  studentId: uuidSchema,
  classId: uuidSchema,
  date: z.string().date(),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  notes: descriptionSchema.optional(),
});

/** Schema for comment/feedback */
export const commentSchema = z.object({
  content: contentSchema,
  submissionId: uuidSchema.optional(),
  blockId: uuidSchema.optional(),
  isPrivate: z.boolean().optional(),
});

// ============================================
// Helper function to validate and get errors
// ============================================

/**
 * Safely parse and validate data with a schema
 * Returns { success: true, data } or { success: false, errors }
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const result = schema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    // Convert Zod errors to simple object
    const errors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      const path = err.path.join('.');
      errors[path] = err.message;
    });

    return { success: false, errors };
  } catch (error) {
    return {
      success: false,
      errors: { _global: 'Invalid request data' },
    };
  }
}

/**
 * Create a JSON response for validation errors (400 Bad Request)
 */
export function validationErrorResponse(errors: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: 'Validation failed', details: errors }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
