# Analytics Enhancement & Notes Reminder Implementation Plan

**Status**: Planning  
**Target Start**: Immediate  
**Priority**: High

---

## Overview

This plan details the implementation of:
1. **Student Analytics Enhancement** - Quiz/topic scores, performance trends, strong/weak topics
2. **Teacher Analytics** - Per-quiz metrics by class, error-rate analysis, topic-specific insights
3. **Persistent Notes Reminder** - Sticky banner to encourage note-taking per topic

---

## Phase 1: Student Analytics Enhancement

### 1.1 New API Endpoint: `/api/student/analytics/detailed`

**Purpose**: Fetch quiz scores aggregated by topic/subject and performance timeline

**Request**:
```
GET /api/student/analytics/detailed
```

**Response Structure**:
```json
{
  "scoresByTopic": [
    {
      "topicId": "string",
      "topicTitle": "string",
      "quizzes": [
        {
          "quizId": "string",
          "quizTitle": "string",
          "score": number,
          "totalQuestions": number,
          "correctAnswers": number,
          "attemptedAt": "ISO-8601 datetime"
        }
      ],
      "averageScore": number,
      "totalAttempts": number,
      "performanceRating": "excellent" | "good" | "fair" | "needs-improvement"
    }
  ],
  "performanceTrend": [
    {
      "date": "YYYY-MM-DD",
      "averageScore": number,
      "quizzesCompleted": number,
      "topicsReviewed": number[]
    }
  ],
  "strongTopics": [
    {
      "topicId": "string",
      "topicTitle": "string",
      "averageScore": number,
      "reason": "string"
    }
  ],
  "weakTopics": [
    {
      "topicId": "string",
      "topicTitle": "string",
      "averageScore": number,
      "reason": "string"
    }
  ],
  "summary": {
    "totalQuizzesTaken": number,
    "overallAverageScore": number,
    "bestPerformingTopic": "string",
    "needsWorkTopic": "string",
    "improvementRate": number
  }
}
```

**Query Logic**:
- Query `student_answers` table filtered by current `student_id`
- Join with `blocks` table to get `assignment_id`
- Join with `assignments` → `paragraph_id` → `paragraphs` → `chapter_id` → `chapters` → `subject_id` → `subjects`
- Aggregate `score`, `is_correct` by subject/topic
- Group `student_answers` by `submitted_at` (weekly/daily buckets) for trend
- Calculate percentiles for `strongTopics` (>75th percentile) and `weakTopics` (<25th percentile)

**Implementation File**: `/app/api/student/analytics/detailed/route.ts`

---

### 1.2 Update Student Analytics Page (`/app/(main)/analytics/page.tsx`)

**New Components**:

#### A. `StudentAnalyticsCharts.tsx`
- **Purpose**: Display performance trend chart using recharts
- **Includes**:
  - LineChart: Date → Avg Score (30-day rolling)
  - BarChart: Topic → Avg Score (comparison)
  - ResponsiveContainer with custom tooltip
- **Props**: `performanceTrend[]`, `strongTopics[]`, `weakTopics[]`

#### B. `TopicScoreCard.tsx`
- **Purpose**: Individual topic performance card
- **Shows**:
  - Topic title
  - Average score (large, colored)
  - Recent quiz results (list)
  - Performance badge (Excellent/Good/Fair/Needs Improvement)
  - "View details" link to `/tools/quiz/[topicId]/analytics` (future route)
- **Props**: `scoresByTopic` item

#### C. `PerformanceSummary.tsx`
- **Purpose**: Top-level summary stats
- **Shows**:
  - Total quizzes taken
  - Overall average score
  - Best & weakest topics
  - Week-over-week improvement
- **Props**: `summary` object from API

**Changes to `StudentAnalytics()` function**:
1. Call `/api/student/analytics/detailed` in addition to existing `/api/studysets/launchpad`
2. Store detailed analytics in separate state: `detailedAnalytics`
3. Render new components below existing studyset list
4. Add tabs: "Overview" (current) | "Topics" (new)

**UI Layout**:
```
[Existing Stats Box Row]

[Tabs: Overview | Topics]

[TAB: Topics]
├─ PerformanceSummary
├─ StudentAnalyticsCharts (LineChart + BarChart)
└─ List of TopicScoreCards with expandable quiz details
```

---

## Phase 2: Teacher Analytics Enhancement

### 2.1 New API Endpoint: `/api/classes/[classId]/analytics/detailed`

**Purpose**: Quiz performance metrics by question/topic across the class

**Request**:
```
GET /api/classes/[classId]/analytics/detailed?topicFilter=topic1,topic2
```

**Response Structure**:
```json
{
  "quizMetrics": [
    {
      "quizId": "string",
      "quizTitle": "string",
      "assignmentId": "string",
      "topicId": "string",
      "topicTitle": "string",
      "classAverage": number,
      "studentCount": number,
      "completionRate": number,
      "questionAnalysis": [
        {
          "blockId": "string",
          "questionText": "string",
          "questionType": "multiple-choice" | "fill_in_blank" | "open_question",
          "correctRate": number,
          "commonMistakes": [
            {
              "answer": "string",
              "frequency": number,
              "percentage": number
            }
          ],
          "averageTimeSeconds": number
        }
      ]
    }
  ],
  "topicErrorRates": [
    {
      "topicId": "string",
      "topicTitle": "string",
      "averageErrorRate": number,
      "quizCount": number,
      "trend": "improving" | "stable" | "declining"
    }
  ],
  "classMetaMetrics": {
    "totalQuizzes": number,
    "totalStudents": number,
    "overallClassAverage": number,
    "averageCompletionRate": number,
    "mostDifficultTopic": { topicId: string; topicTitle: string; errorRate: number },
    "easiestTopic": { topicId: string; topicTitle: string; errorRate: number }
  }
}
```

**Query Logic**:
- Query `student_answers` for all students in class
- Join with blocks → assignments → paragraphs → chapters → subjects
- Group by assignment/topic
- Calculate `is_correct` percentage per question (block)
- Extract common wrong answers from `answer_data` for open questions
- Track `submitted_at` for trend analysis (week-over-week)

**Implementation File**: `/app/api/classes/[classId]/analytics/detailed/route.ts`

---

### 2.2 New Teacher Analytics Page: `/app/(main)/analytics/teacher/page.tsx`

**Components**:

#### A. `TeacherAnalyticsFilters.tsx`
- **Purpose**: Multi-select class/topic filter UI
- **Includes**:
  - Class selector (dropdown, multi-select)
  - Topic filter (multi-select pills)
  - Date range picker (last 7/30 days, custom)
  - Apply button
- **Props**: `classes[]`, `topics[]`, `onFilter`
- **State**: Managed by parent page

#### B. `QuizPerformanceTable.tsx`
- **Purpose**: Table of quizzes with avg scores per class
- **Columns**:
  - Quiz title
  - Topic
  - Avg score (%)
  - Students who attempted
  - Completion rate
  - Action: "View details" → expands to show question-level analysis
- **Props**: `quizMetrics[]`

#### C. `ErrorRateChart.tsx`
- **Purpose**: Histogram of topic → error rate
- **Uses**: recharts BarChart
- **Props**: `topicErrorRates[]`

#### D. `QuestionAnalysisDetail.tsx`
- **Purpose**: Expandable detail row showing per-question metrics
- **Shows**:
  - Question text
  - Correct rate (%)
  - Top 3 common mistakes (for open questions)
  - Average time to answer
- **Props**: `questionAnalysis[]` item

#### E. `ClassMetaMetricsCard.tsx`
- **Purpose**: High-level summary for selected classes
- **Shows**:
  - Total quizzes
  - Overall class average
  - Most/least difficult topics
  - Trending direction (improving/stable/declining)
- **Props**: `classMetaMetrics`

**Page Structure**:
```
[TeacherAnalyticsFilters]

[ClassMetaMetricsCard]

[ErrorRateChart (histogram)]

[QuizPerformanceTable]
├─ [QuestionAnalysisDetail] (expandable per quiz)
```

**Page Logic**:
1. On mount: fetch `/api/classes/[classId]/analytics/detailed` for selected class
2. Allow user to filter by topic/date range
3. Re-fetch on filter change
4. Show loading state during fetch
5. Display summary metrics at top
6. Render table with expandable question detail

---

## Phase 3: Persistent Notes Reminder

### 3.1 `NotesReminder` Component

**File**: `/app/components/notes/NotesReminder.tsx`

**Purpose**: Sticky banner prompting "Add notes for [topic]"

**Props**:
```typescript
interface NotesReminderProps {
  topicId: string;
  topicTitle: string;
  onNotesTaken?: () => void;
  dismissable?: boolean; // default: true
}
```

**Behavior**:
- **Trigger**: Rendered on page load if:
  - User is a student (`role === 'student'`)
  - User has completed ≥1 quiz/activity on `topicId` (check `student_answers` table)
  - User has NOT created any notes for `topicId` (check `student_notes` table OR use localStorage as interim)
  - Dismissed state NOT set in localStorage for this topic
  
- **Dismissal Logic** (localStorage key format):
  ```
  cautie:notes-reminder:dismissed:${topicId}
  ```
  - Value: timestamp of dismissal
  - TTL: 30 days (check on render; clear if expired)
  - "Dismiss" button sets flag
  - "Go to notes" button navigates to notes editor, clears reminder on return

- **Styling**:
  - Fixed banner at bottom-right (z-index: 40)
  - Color: accent brand (like existing UI)
  - Icon: BookmarkPlus or FileText
  - Close button (X)
  - CTA button: "Create notes"

**Implementation**:
```typescript
'use client';

export function NotesReminder({ topicId, topicTitle, onNotesTaken, dismissable = true }: NotesReminderProps) {
  const [isDismissed, setIsDismissed] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for dismissal flag
    const dismissKey = `cautie:notes-reminder:dismissed:${topicId}`;
    const storedTime = localStorage.getItem(dismissKey);
    
    if (storedTime) {
      const daysSinceDismissal = (Date.now() - parseInt(storedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissal < 30) {
        setIsDismissed(true);
        setIsLoading(false);
        return;
      } else {
        localStorage.removeItem(dismissKey);
      }
    }

    // Check if user has notes for this topic (query /api/student/notes/check)
    async function checkNotesStatus() {
      try {
        const res = await fetch(`/api/student/notes/check?topicId=${topicId}`, {
          cache: 'no-store'
        });
        const { hasNotes, hasActivity } = await res.json();
        
        // Show reminder only if: has activity but no notes
        setIsDismissed(hasNotes || !hasActivity);
      } catch (err) {
        setIsDismissed(true); // default: hide on error
      } finally {
        setIsLoading(false);
      }
    }

    void checkNotesStatus();
  }, [topicId]);

  const handleDismiss = () => {
    const dismissKey = `cautie:notes-reminder:dismissed:${topicId}`;
    localStorage.setItem(dismissKey, Date.now().toString());
    setIsDismissed(true);
  };

  const handleCreateNotes = () => {
    onNotesTaken?.();
    // Navigate to notes editor, which will clear reminder on close
  };

  if (isLoading || isDismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm">
      <Card className="border-accent-brand bg-accent-brand/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-accent-brand mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">Add notes for "{topicTitle}"</p>
              <p className="text-xs text-muted-foreground mt-1">
                You've completed quizzes on this topic. Add notes to improve retention.
              </p>
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  onClick={handleCreateNotes}
                  className="bg-accent-brand hover:bg-accent-brand/90"
                >
                  Create notes
                </Button>
                {dismissable && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={handleDismiss}
                    className="text-xs"
                  >
                    Dismiss
                  </Button>
                )}
              </div>
            </div>
            {dismissable && (
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3.2 New API: `/api/student/notes/check`

**Purpose**: Check if user has notes for a topic and has completed activity on it

**Request**:
```
GET /api/student/notes/check?topicId=string
```

**Response**:
```json
{
  "topicId": "string",
  "hasNotes": boolean,
  "hasActivity": boolean,
  "lastActivityAt": "ISO-8601 datetime" | null,
  "notesCreatedAt": "ISO-8601 datetime" | null
}
```

**Query Logic**:
- Check `student_notes` table for entries matching `student_id` and `topic_id`
- Check `student_answers` + join to topics for completed activities
- Return boolean flags

**Implementation File**: `/app/api/student/notes/check/route.ts`

### 3.3 Placement: Where to show `NotesReminder`

**Pages**:
1. **`/app/(main)/class/[classId]/page.tsx`** (or tab within class view)
   - Show when entering a class context
   - Pass `topicId` = current chapter/topic being studied

2. **`/app/(main)/tools/flashcards/[setId]/page.tsx`** (if using quizzes from a topic)
   - Show after completing a flashcard session
   - Extract `topicId` from flashcard metadata

3. **`/app/(main)/tools/quiz/[quizId]/results/page.tsx`** (quiz results page)
   - Show after quiz completion
   - Pass `topicId` from quiz context
   - Most natural trigger point

**Implementation approach**:
- Wrap `NotesReminder` in each page
- Extract `topicId` from route params or page context
- Pass as prop to component

---

## Implementation Sequence & Order

### Order (Recommended for dependency management):

1. **Phase 3.2**: `/api/student/notes/check` endpoint (independent, simple)
2. **Phase 3.1**: `NotesReminder` component (depends on Phase 3.2)
3. **Phase 1.1**: `/api/student/analytics/detailed` endpoint (independent, complex)
4. **Phase 1.2**: Update student analytics page with new charts & tabs (depends on Phase 1.1)
5. **Phase 2.1**: `/api/classes/[classId]/analytics/detailed` endpoint (similar to Phase 1.1)
6. **Phase 2.2**: New teacher analytics page (depends on Phase 2.1 + Phase 2.2 components)
7. **Phase 3**: Integrate `NotesReminder` into pages (depends on Phase 3.1)

**Rationale**: Start with API endpoints (backend), then UI components (frontend), then integration.

---

## Database Queries Reference

### Key Tables Needed:
- `student_answers` (core: scores per quiz question)
- `blocks` (quiz structure)
- `assignments` (assignment metadata)
- `paragraphs` (content units)
- `chapters` (chapter grouping)
- `subjects` (top-level subjects/topics)
- `student_notes` (for notes existence check) *may not exist yet*
- `class_members` (class roster)
- `profiles` (student names)

### Assumed table schema:
```sql
-- Should exist:
student_answers(
  id, student_id, block_id, 
  answer_data, is_correct, score, 
  submitted_at, graded_at
)

assignments(id, class_id, paragraph_id, title, ...)
blocks(id, assignment_id, type, ...)
paragraphs(id, chapter_id, title, ...)
chapters(id, subject_id, title, ...)
subjects(id, title, ...)

-- May need to create:
student_notes(
  id, student_id, topic_id, 
  content, created_at, updated_at
)
```

---

## Pitfalls & Mitigations

### Pitfall 1: Complex Quiz-to-Topic Mapping
**Issue**: A quiz block might belong to multiple topics via assignments.
**Mitigation**:
- Use `assignments.paragraph_id` → `paragraphs.chapter_id` → `chapters.subject_id` for canonical topic mapping
- Cache this mapping in a helper function to avoid N+1 queries
- Return `topicId` and `topicTitle` in all API responses

### Pitfall 2: Performance with Large `student_answers` Table
**Issue**: Querying all answers for a student/class could be slow.
**Mitigation**:
- Add database indexes on `(student_id, submitted_at)` and `(class_id, submitted_at)`
- Implement server-side caching (in-memory or Redis) for 1 hour
- Implement pagination/limits (e.g., return only last 90 days of data by default)
- Use `limit` in Supabase queries

### Pitfall 3: localStorage Collisions
**Issue**: localStorage key format might collide with other features.
**Mitigation**:
- Use consistent prefix: `cautie:notes-reminder:dismissed:${topicId}`
- Version the key format in case it changes: `cautie:notes-reminder:v1:dismissed:${topicId}`
- Document the format clearly

### Pitfall 4: Notes Table Doesn't Exist Yet
**Issue**: `student_notes` table may not be created.
**Mitigation**:
- If table doesn't exist, fall back to checking for localStorage flag only
- Or: assume no notes exist (show reminder always until dismissed)
- Plan to create table in a future DB migration

### Pitfall 5: Race Conditions on Dismissal
**Issue**: User clicks "Dismiss" twice, or dismisses while data is still loading.
**Mitigation**:
- Use `useCallback` for dismiss handler with early return check
- Debounce localStorage write
- Don't refetch after dismiss (just hide component)

### Pitfall 6: Topic vs Subject Terminology
**Issue**: Codebase uses "subject" and "topic" interchangeably.
**Mitigation**:
- Be explicit: `subject_id` in DB, but UI can call it "Topic"
- In API responses, use both `topicId`/`topicTitle` for clarity
- Document which term refers to which DB column

### Pitfall 7: Teacher Filter Performance
**Issue**: Filtering by multiple classes/topics could be slow.
**Mitigation**:
- Validate filter params before querying
- Limit to max 5 classes/10 topics at once
- Show warning if selection is too broad
- Cache filtered results for 5 minutes

### Pitfall 8: Common Mistakes Extraction
**Issue**: For open questions, extracting common wrong answers from `answer_data` JSON is fragile.
**Mitigation**:
- Only attempt extraction for certain block types (open_question)
- Truncate common mistakes to top 3
- If extraction fails, show "View sample answers" instead
- Add error logging for debugging

---

## Type Definitions to Add

Add to `/app/lib/types.ts`:

```typescript
// Student Analytics
export type StudentTopicScore = {
  topicId: string;
  topicTitle: string;
  quizzes: Array<{
    quizId: string;
    quizTitle: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    attemptedAt: string;
  }>;
  averageScore: number;
  totalAttempts: number;
  performanceRating: 'excellent' | 'good' | 'fair' | 'needs-improvement';
};

export type StudentPerformanceTrend = {
  date: string;
  averageScore: number;
  quizzesCompleted: number;
  topicsReviewed: string[];
};

export type StudentAnalyticsDetail = {
  scoresByTopic: StudentTopicScore[];
  performanceTrend: StudentPerformanceTrend[];
  strongTopics: Array<{
    topicId: string;
    topicTitle: string;
    averageScore: number;
    reason: string;
  }>;
  weakTopics: Array<{
    topicId: string;
    topicTitle: string;
    averageScore: number;
    reason: string;
  }>;
  summary: {
    totalQuizzesTaken: number;
    overallAverageScore: number;
    bestPerformingTopic: string;
    needsWorkTopic: string;
    improvementRate: number;
  };
};

// Teacher Analytics
export type QuestionAnalysisDetail = {
  blockId: string;
  questionText: string;
  questionType: 'multiple-choice' | 'fill_in_blank' | 'open_question' | string;
  correctRate: number;
  commonMistakes: Array<{
    answer: string;
    frequency: number;
    percentage: number;
  }>;
  averageTimeSeconds: number;
};

export type QuizMetric = {
  quizId: string;
  quizTitle: string;
  assignmentId: string;
  topicId: string;
  topicTitle: string;
  classAverage: number;
  studentCount: number;
  completionRate: number;
  questionAnalysis: QuestionAnalysisDetail[];
};

export type TopicErrorRate = {
  topicId: string;
  topicTitle: string;
  averageErrorRate: number;
  quizCount: number;
  trend: 'improving' | 'stable' | 'declining';
};

export type TeacherAnalyticsDetail = {
  quizMetrics: QuizMetric[];
  topicErrorRates: TopicErrorRate[];
  classMetaMetrics: {
    totalQuizzes: number;
    totalStudents: number;
    overallClassAverage: number;
    averageCompletionRate: number;
    mostDifficultTopic: { topicId: string; topicTitle: string; errorRate: number };
    easiestTopic: { topicId: string; topicTitle: string; errorRate: number };
  };
};

// Notes
export type NotesCheckResponse = {
  topicId: string;
  hasNotes: boolean;
  hasActivity: boolean;
  lastActivityAt: string | null;
  notesCreatedAt: string | null;
};
```

---

## Testing Strategy

### Unit Tests:
- Test aggregate calculations (average, error rates) with mock data
- Test localStorage dismissal logic
- Test date range filtering

### Integration Tests:
- Mock Supabase queries
- Test API endpoints with sample data
- Verify type safety in API responses

### Manual Testing:
1. **Student Analytics**:
   - Create mock quiz submissions
   - Verify topic aggregation
   - Test chart rendering with >50 data points
   - Test sorting (strong/weak topics)

2. **Teacher Analytics**:
   - Create multiple student submissions on same quiz
   - Verify class average calculation
   - Expand question detail rows
   - Filter by topic

3. **Notes Reminder**:
   - Complete a quiz
   - Visit class page → should see reminder
   - Click "Dismiss" → verify localStorage is set
   - Refresh → reminder should not appear
   - Wait 30+ days (simulate) → reminder should reappear
   - Create notes → reminder should disappear on next page load

---

## Success Criteria

- [ ] Student can see quiz scores broken down by topic with >80% accuracy
- [ ] Student can see 30-day performance trend chart (recharts rendering correctly)
- [ ] Student can identify 3+ strong/weak topics with explanation
- [ ] Teacher can filter analytics by class and see per-quiz metrics
- [ ] Teacher can view per-question error rates and common mistakes
- [ ] Teacher histogram shows topic error rates sorted correctly
- [ ] Notes reminder appears after quiz completion (not dismissed)
- [ ] Notes reminder persists dismissal for 30 days
- [ ] All API responses include proper error handling (<500ms response time)
- [ ] No N+1 queries in API implementations

---

## File Checklist

### New Files to Create:
- [ ] `/app/api/student/analytics/detailed/route.ts`
- [ ] `/app/api/student/notes/check/route.ts`
- [ ] `/app/api/classes/[classId]/analytics/detailed/route.ts`
- [ ] `/app/(main)/analytics/teacher/page.tsx`
- [ ] `/app/components/analytics/StudentAnalyticsCharts.tsx`
- [ ] `/app/components/analytics/TopicScoreCard.tsx`
- [ ] `/app/components/analytics/PerformanceSummary.tsx`
- [ ] `/app/components/analytics/TeacherAnalyticsFilters.tsx`
- [ ] `/app/components/analytics/QuizPerformanceTable.tsx`
- [ ] `/app/components/analytics/ErrorRateChart.tsx`
- [ ] `/app/components/analytics/QuestionAnalysisDetail.tsx`
- [ ] `/app/components/analytics/ClassMetaMetricsCard.tsx`
- [ ] `/app/components/notes/NotesReminder.tsx`

### Files to Update:
- [ ] `/app/(main)/analytics/page.tsx` (add new tabs & components)
- [ ] `/app/lib/types.ts` (add new types)
- [ ] Database migration (if creating `student_notes` table)

### Optional Refactoring:
- [ ] Extract common filter logic from teacher analytics into reusable hooks
- [ ] Create `/app/hooks/useAnalyticsData.ts` for shared data fetching

---

## Environment & Dependencies

**Already installed**:
- recharts (for charts)
- lucide-react (for icons)
- date-fns (for date operations)
- zod (for validation)
- Supabase client

**No new dependencies needed** for Phase 1-3 as described.

---

## Future Enhancements (Out of Scope)

1. **Export analytics as PDF/CSV**
2. **AI-powered recommendations** based on weak topics
3. **Predictive analytics**: Flagging students likely to struggle
4. **Real-time dashboard** with WebSocket updates
5. **Benchmark against class/school averages**
6. **Topic-wise study recommendations** (e.g., "You scored 45% on topic X, try these resources")

---

## Timeline Estimate

| Phase | Component(s) | Effort | Duration |
|-------|--------------|--------|----------|
| 3.2 | Notes check API | XS | 30 min |
| 3.1 | NotesReminder component | S | 1.5 hours |
| 1.1 | Student analytics API | M | 2 hours |
| 1.2 | Student analytics page + charts | M | 2.5 hours |
| 2.1 | Teacher analytics API | M | 2.5 hours |
| 2.2 | Teacher analytics page + table | L | 3 hours |
| 3 | Integration & testing | S | 1.5 hours |
| **TOTAL** | | | ~14 hours |

---

## Questions for Clarification

1. **student_notes table**: Does it exist? If not, should we create it or use localStorage only for MVP?
2. **Activity detection**: Should we only check `student_answers` or also `activity_logs`?
3. **Strong/Weak threshold**: Should we use percentiles (25th/75th) or absolute scores (>75%, <60%)?
4. **Teacher class scope**: Should analytics filter to only the teacher's classes or show all (if admin)?
5. **Common mistakes extraction**: For open questions, should we show all unique answers or only those >5% frequency?
6. **Chart date range**: Default 30 days? Configurable?
7. **Performance optimization**: Should we add database indexes proactively or wait for performance issues?

---

## Sign-Off

**Prepared by**: Claude Code  
**Date**: June 22, 2026  
**Status**: Ready for implementation  
**Next Step**: Prioritize Phase 3.2 (simplest), then move to 1.1 & 2.1 in parallel
