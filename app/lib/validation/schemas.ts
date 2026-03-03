import { z } from 'zod';

// ============================================
// COMMON VALIDATION SCHEMAS
// ============================================

export const uuidSchema = z.string().uuid("ID must be a valid UUID");

export const emailSchema = z.string().email("Invalid email format");

export const nonEmptyStringSchema = z.string().min(1, "This field is required");

export const optionalNonEmptyString = z.string().min(1).optional();

// ============================================
// CLASSES
// ============================================

export const createClassSchema = z.object({
  name: nonEmptyStringSchema,
  description: z.string().optional().nullable()
});

export const updateClassSchema = z.object({
  name: nonEmptyStringSchema.optional(),
  description: z.string().optional().nullable()
});

// ============================================
// SUBJECTS
// ============================================

export const createSubjectSchema = z.object({
  title: nonEmptyStringSchema,
  description: z.string().optional().nullable(),
  class_ids: z.array(uuidSchema).optional().nullable()
});

export const updateSubjectSchema = z.object({
  id: uuidSchema,
  title: nonEmptyStringSchema.optional(),
  description: z.string().optional().nullable(),
  class_ids: z.array(uuidSchema).optional()
});

export const deleteSubjectSchema = z.object({
  id: uuidSchema
});

// ============================================
// CHAPTERS
// ============================================

export const createChapterSchema = z.object({
  title: nonEmptyStringSchema,
  description: z.string().optional().nullable(),
  chapter_number: z.number().int().positive("Chapter number must be positive"),
  subject_id: uuidSchema
});

export const updateChapterSchema = z.object({
  title: nonEmptyStringSchema.optional(),
  description: z.string().optional().nullable(),
  chapter_number: z.number().int().positive().optional()
});

// ============================================
// PARAGRAPHS
// ============================================

export const createParagraphSchema = z.object({
  title: nonEmptyStringSchema,
  content: z.any().optional(), // Rich content (JSON)
  paragraph_number: z.number().int().positive("Paragraph number must be positive")
});

export const updateParagraphSchema = z.object({
  title: nonEmptyStringSchema.optional(),
  content: z.any().optional(),
  paragraph_number: z.number().int().positive().optional()
});

// ============================================
// ASSIGNMENTS
// ============================================

export const createAssignmentSchema = z.object({
  title: nonEmptyStringSchema,
  paragraph_id: uuidSchema.optional().nullable(),
  class_id: uuidSchema.optional().nullable(),
  assignment_index: z.number().int().nonnegative().default(0),
  type: z.enum(['homework', 'small_test', 'big_test']).default('homework'),
  scheduled_start_at: z.string().datetime().optional().nullable(),
  scheduled_end_at: z.string().datetime().optional().nullable(),
  answers_enabled: z.boolean().default(false),
  description: z.string().optional().nullable(),
  linked_content: z.any().optional().nullable()
});

// ============================================
// BLOCKS
// ============================================

export const blockTypeEnum = z.enum([
  'text', 'image', 'video', 'multiple_choice', 'open_question',
  'fill_in_blank', 'drag_drop', 'ordering', 'media_embed',
  'divider', 'rich_text', 'executable_code', 'code', 'list',
  'quote', 'layout', 'complex'
]);

export const createBlockSchema = z.object({
  type: blockTypeEnum,
  data: z.any().refine(val => val !== null && val !== undefined, "Block data is required"),
  paragraph_id: uuidSchema.optional().nullable(),
  assignment_id: uuidSchema.optional().nullable(),
  position: z.number().int().nonnegative().optional(),
  locked: z.boolean().optional(),
  show_feedback: z.boolean().optional(),
  ai_grading_override: z.any().optional().nullable()
});

export const updateBlockSchema = z.object({
  type: blockTypeEnum.optional(),
  data: z.any().optional(),
  position: z.number().int().nonnegative().optional(),
  locked: z.boolean().optional(),
  show_feedback: z.boolean().optional(),
  ai_grading_override: z.any().optional().nullable()
});

export const reorderBlocksSchema = z.object({
  block_ids: z.array(uuidSchema)
});

// ============================================
// GRADING
// ============================================

export const gradeSubmissionSchema = z.object({
  rubricScores: z.array(z.object({
    rubric_item_id: uuidSchema,
    score: z.number(),
    feedback: z.string().optional().nullable()
  })).optional().nullable(),
  feedback: z.string().optional().nullable()
});

// ============================================
// ATTENDANCE
// ============================================

export const markAttendanceSchema = z.object({
  sessionId: uuidSchema,
  studentId: uuidSchema,
  status: z.enum(['present', 'absent', 'late', 'excused']),
  notes: z.string().optional().nullable()
});

export const updateAssignmentSchema = z.object({
  title: nonEmptyStringSchema.optional(),
  paragraph_id: uuidSchema.optional().nullable(),
  class_id: uuidSchema.optional().nullable(),
  assignment_index: z.number().int().nonnegative().optional(),
  type: z.enum(['homework', 'small_test', 'big_test']).optional(),
  scheduled_start_at: z.string().datetime().optional().nullable(),
  scheduled_end_at: z.string().datetime().optional().nullable(),
  answers_enabled: z.boolean().optional(),
  description: z.string().optional().nullable()
});

export const toggleAssignmentCompletedSchema = z.object({
  completed: z.boolean()
});

// ============================================
// SUBMISSIONS
// ============================================

export const createSubmissionSchema = z.object({
  assignment_id: uuidSchema,
  content: z.record(z.any()).optional(),
  answers: z.array(z.object({
    block_id: uuidSchema,
    answer: z.any()
  }))
});


// ============================================
// CLASS MEMBERS
// ============================================

export const addClassMemberSchema = z.object({
  user_id: uuidSchema,
  role: z.enum(['student', 'ta']).default('student')
});

// ============================================
// CLASS JOIN
// ============================================

export const joinClassSchema = z.object({
  class_code: nonEmptyStringSchema
});

// ============================================
// NOTIFICATIONS
// ============================================

export const createNotificationSchema = z.object({
  type: z.string().min(1, "Notification type is required"),
  title: nonEmptyStringSchema,
  message: nonEmptyStringSchema,
  data: z.record(z.any()).optional().default({}),
  user_id: uuidSchema.optional().nullable(),
  expires_at: z.string().datetime().optional().nullable()
});

export const markNotificationReadSchema = z.object({
  notification_ids: z.array(uuidSchema).optional().default([]),
  mark_all: z.boolean().default(false)
});

export const notificationPreferencesSchema = z.object({
  announcement: z.boolean().default(true),
  submission_graded: z.boolean().default(true),
  assignment_due: z.boolean().default(true),
  assignment_created: z.boolean().default(true),
  class_invitation: z.boolean().default(true),
  ai_content_generated: z.boolean().default(true),
  ai_grading_completed: z.boolean().default(true),
  comment_added: z.boolean().default(true),
  deadline_reminder: z.boolean().default(true),
  email_enabled: z.boolean().default(true),
  push_enabled: z.boolean().default(true)
});

// ============================================
// PERSONAL TASKS
// ============================================

export const createPersonalTaskSchema = z.object({
  title: nonEmptyStringSchema,
  description: z.string().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  subject: z.string().optional().nullable()
});

export const updatePersonalTaskSchema = z.object({
  title: nonEmptyStringSchema.optional(),
  description: z.string().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  subject: z.string().optional().nullable(),
  completed: z.boolean().optional()
});

export const bulkClassesSchema = z.object({
  action: z.enum([
    'archive',
    'unarchive',
    'delete',
    'update',
    'duplicate'
  ]),
  class_ids: z.array(uuidSchema).min(1, "At least one class ID is required"),
  data: z.record(z.any()).optional().nullable()
});

export const createClassSubjectSchema = z.object({
  title: nonEmptyStringSchema,
  description: z.string().optional().nullable(),
  class_label: z.string().optional().nullable(),
  cover_type: z.string().optional().nullable(),
  cover_image_url: z.string().url().optional().nullable(),
  ai_icon_seed: z.string().optional().nullable()
});

// ============================================
// MATERIALS
// ============================================

export const createMaterialSchema = z.object({
  title: nonEmptyStringSchema,
  description: z.string().optional().nullable(),
  type: z.enum(['file', 'link', 'text', 'video', 'audio']),
  content: z.any().optional(),
  class_id: uuidSchema.optional().nullable(),
  is_public: z.boolean().default(false)
});

export const updateMaterialSchema = z.object({
  title: nonEmptyStringSchema.optional(),
  description: z.string().optional().nullable(),
  type: z.enum(['file', 'link', 'text', 'video', 'audio']).optional(),
  content: z.any().optional(),
  is_public: z.boolean().optional()
});

// ============================================
// ANNOUNCEMENTS
// ============================================

export const createAnnouncementSchema = z.object({
  title: nonEmptyStringSchema,
  content: nonEmptyStringSchema,
  class_id: uuidSchema
});

export const updateAnnouncementSchema = z.object({
  title: nonEmptyStringSchema.optional(),
  content: nonEmptyStringSchema.optional()
});

// ============================================
// BULK OPERATIONS
// ============================================

export const bulkArchiveClassesSchema = z.object({
  class_ids: z.array(uuidSchema).min(1, "At least one class must be selected")
});

export const bulkDeleteAssignmentsSchema = z.object({
  assignment_ids: z.array(uuidSchema).min(1, "At least one assignment must be selected")
});

// ============================================
// SEARCH & FILTER
// ============================================

export const searchQuerySchema = z.object({
  q: nonEmptyStringSchema,
  type: z.enum(['assignments', 'subjects', 'chapters', 'paragraphs', 'all']).default('all'),
  class_id: uuidSchema.optional().nullable()
});

export const filterAssignmentsSchema = z.object({
  class_id: uuidSchema.optional().nullable(),
  subject_id: uuidSchema.optional().nullable(),
  chapter_id: uuidSchema.optional().nullable(),
  paragraph_id: uuidSchema.optional().nullable(),
  type: z.enum(['homework', 'small_test', 'big_test']).optional(),
  completed: z.boolean().optional(),
  due_date_from: z.string().datetime().optional().nullable(),
  due_date_to: z.string().datetime().optional().nullable()
});

// ============================================
// PAGINATION
// ============================================

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20)
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export function formatValidationErrors(error: z.ZodError): string {
  return error.errors.map(err => {
    const field = err.path.join('.');
    const message = err.message;
    return `${field}: ${message}`;
  }).join('; ');
}
