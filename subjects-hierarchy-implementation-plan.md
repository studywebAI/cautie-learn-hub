# Subjects Hierarchy Implementation Plan

## Current Status
- Subjects API is broken due to missing database relations
- Mock data is being returned for visual demo
- Need real hierarchical data: Subject → Chapters → Paragraphs → Assignments → Blocks

## Required Database Schema

### Tables to Create:
1. **chapters**
   - id, subject_id, chapter_number, title, ai_summary, summary_overridden, created_at
   - UNIQUE(subject_id, chapter_number)

2. **paragraphs**
   - id, chapter_id, paragraph_number, title, created_at
   - UNIQUE(chapter_id, paragraph_number)

3. **assignments**
   - id, paragraph_id, assignment_index, title, answers_enabled, created_at
   - UNIQUE(paragraph_id, assignment_index)

4. **blocks**
   - id, assignment_id, type, position, data (JSONB), created_at

5. **progress_snapshots**
   - student_id, paragraph_id, completion_percent, updated_at
   - PRIMARY KEY (student_id, paragraph_id)

6. **session_logs**
   - id, student_id, paragraph_id, started_at, finished_at, created_at

7. **student_answers**
   - id, student_id, block_id, answer_data, is_correct, score, feedback, graded_by_ai, submitted_at, graded_at

## Implementation Steps

### 1. Database Setup
- Create all tables with proper relationships
- Add RLS policies for security
- Create helper functions for letter indexing

### 2. API Updates
- Update subjects API to join with chapters/paragraphs/progress_snapshots
- Return real progress data instead of mock data
- Add APIs for CRUD operations on chapters, paragraphs, assignments

### 3. Frontend Updates
- Ensure SubjectsGrid displays real progress from database
- Add functionality to create chapters/paragraphs (future feature)

## Current API Fix
Since tables don't exist yet, the API currently returns mock data. Once tables are created, update the query to:

```sql
SELECT
  s.*,
  (
    SELECT json_agg(
      json_build_object(
        'id', p.id,
        'title', p.title,
        'progress', COALESCE(ps.completion_percent, 0)
      )
    )
    FROM paragraphs p
    LEFT JOIN progress_snapshots ps ON p.id = ps.paragraph_id
    WHERE p.chapter_id IN (
      SELECT id FROM chapters WHERE subject_id = s.id
      ORDER BY chapter_number DESC
      LIMIT 1
    )
    ORDER BY p.paragraph_number
    LIMIT 3
  ) as recent_paragraphs
FROM subjects s
WHERE s.class_id = $1
ORDER BY s.created_at DESC
```

## Next Steps
1. Create database schema SQL
2. Apply SQL to Supabase
3. Update API queries
4. Test with real data