# Analytics Implementation - Quick Reference Checklist

Use this checklist to track implementation progress across all three phases.

---

## Phase 1: Student Analytics Enhancement

### API Endpoint: `/api/student/analytics/detailed`
- [ ] Create route file: `/app/api/student/analytics/detailed/route.ts`
- [ ] Implement GET handler with auth check
- [ ] Query `student_answers` with subject/chapter/paragraph joins
- [ ] Implement `aggregateScoresByTopic()` function
- [ ] Implement `extractPerformanceTrend()` function
- [ ] Implement `identifyStrongWeakTopics()` function
- [ ] Implement `generateSummary()` function
- [ ] Add in-memory caching (1 hour TTL)
- [ ] Error handling & try-catch
- [ ] Test with sample data (10+ quiz answers)

### Types
- [ ] Add `StudentTopicScore` to `/app/lib/types.ts`
- [ ] Add `StudentPerformanceTrend` to `/app/lib/types.ts`
- [ ] Add `StudentAnalyticsDetail` to `/app/lib/types.ts`

### Components
- [ ] Create `/app/components/analytics/StudentAnalyticsCharts.tsx`
  - [ ] LineChart for 30-day trend
  - [ ] BarChart for topic comparison
  - [ ] ResponsiveContainer + Tooltip
- [ ] Create `/app/components/analytics/TopicScoreCard.tsx`
  - [ ] Topic title, avg score badge
  - [ ] List of recent quizzes
  - [ ] Performance rating indicator
- [ ] Create `/app/components/analytics/PerformanceSummary.tsx`
  - [ ] Stat boxes: total quizzes, overall avg, best/worst topics, improvement rate

### Page Updates
- [ ] Update `/app/(main)/analytics/page.tsx`
  - [ ] Add state for `detailedAnalytics`
  - [ ] Fetch `/api/student/analytics/detailed` on mount
  - [ ] Add tabs: "Overview" | "Topics"
  - [ ] Render new components under Topics tab
  - [ ] Add loading state during fetch

### Testing
- [ ] Unit test: `aggregateScoresByTopic()` with mock data
- [ ] Unit test: `extractPerformanceTrend()` with 30 data points
- [ ] Integration test: GET endpoint returns correct structure
- [ ] Manual test: View analytics page, verify charts render
- [ ] Manual test: Verify trend line shows correct dates
- [ ] Manual test: Verify topic cards show correct scores

---

## Phase 2: Teacher Analytics Enhancement

### API Endpoint: `/api/classes/[classId]/analytics/detailed`
- [ ] Create route file: `/app/api/classes/[classId]/analytics/detailed/route.ts`
- [ ] Implement GET handler with auth + access control check
- [ ] Query `student_answers` for all class members
- [ ] Filter by topic if `topicFilter` parameter provided
- [ ] Implement `buildQuizMetrics()` function
  - [ ] Aggregate by assignment
  - [ ] Calculate class average per quiz
  - [ ] Extract common mistakes for open questions
- [ ] Implement `calculateTopicErrorRates()` function
  - [ ] Group by subject
  - [ ] Calculate error percentage
  - [ ] Determine trend (improving/stable/declining)
- [ ] Implement `calculateClassMetaMetrics()` function
- [ ] Add input validation (max 5 classes, max 10 topics)
- [ ] Error handling & try-catch
- [ ] Test with 20+ student submissions across 5 quizzes

### Types
- [ ] Add `QuestionAnalysisDetail` to `/app/lib/types.ts`
- [ ] Add `QuizMetric` to `/app/lib/types.ts`
- [ ] Add `TopicErrorRate` to `/app/lib/types.ts`
- [ ] Add `TeacherAnalyticsDetail` to `/app/lib/types.ts`

### Components
- [ ] Create `/app/components/analytics/TeacherAnalyticsFilters.tsx`
  - [ ] Class selector (multi-select dropdown)
  - [ ] Topic filter (multi-select pills)
  - [ ] Date range picker
  - [ ] Apply button + state management
- [ ] Create `/app/components/analytics/QuizPerformanceTable.tsx`
  - [ ] Columns: Quiz title, Topic, Avg score, Students, Completion rate
  - [ ] Expandable rows for question detail
  - [ ] Sorting by score/completion
- [ ] Create `/app/components/analytics/ErrorRateChart.tsx`
  - [ ] BarChart: Topic title (X) → Error rate % (Y)
  - [ ] Sort by error rate descending
  - [ ] Tooltip shows quiz count
- [ ] Create `/app/components/analytics/QuestionAnalysisDetail.tsx`
  - [ ] Question text (first 100 chars)
  - [ ] Correct rate %
  - [ ] Common mistakes (top 3 for open questions)
  - [ ] Average time (if available)
- [ ] Create `/app/components/analytics/ClassMetaMetricsCard.tsx`
  - [ ] Total quizzes, students, overall average
  - [ ] Most difficult / easiest topics
  - [ ] Trend indicators (up/down/stable)

### Page
- [ ] Create `/app/(main)/analytics/teacher/page.tsx`
  - [ ] Import filter component
  - [ ] Manage filter state (class, topics, date range)
  - [ ] Fetch `/api/classes/[classId]/analytics/detailed` on filter change
  - [ ] Handle multiple classes (tab or accordion layout)
  - [ ] Render: MetricsCard → Charts → Table
  - [ ] Loading/error states

### Testing
- [ ] Unit test: `buildQuizMetrics()` with mixed correct/incorrect answers
- [ ] Unit test: `calculateTopicErrorRates()` with 3+ topics
- [ ] Integration test: Verify endpoint returns filtered data correctly
- [ ] Manual test: Select class, view error rate histogram
- [ ] Manual test: Expand quiz row, verify question detail appears
- [ ] Manual test: Filter by topic, verify metrics update
- [ ] Manual test: Verify most/least difficult topics labeled correctly

---

## Phase 3: Persistent Notes Reminder

### API Endpoint: `/api/student/notes/check`
- [ ] Create route file: `/app/api/student/notes/check/route.ts`
- [ ] Implement GET handler with auth check
- [ ] Parse `topicId` from query params
- [ ] Query `student_notes` table (with graceful fallback if table missing)
- [ ] Query `student_answers` for activity on topic
- [ ] Return `hasNotes`, `hasActivity`, timestamps
- [ ] Error handling (esp. table-not-found)
- [ ] Test: Should return hasNotes=false when no entries exist
- [ ] Test: Should detect activity correctly

### Types
- [ ] Add `NotesCheckResponse` to `/app/lib/types.ts`

### Component
- [ ] Create `/app/components/notes/NotesReminder.tsx`
  - [ ] useEffect: Check localStorage dismissal flag (30-day TTL)
  - [ ] useEffect: Fetch `/api/student/notes/check`
  - [ ] State: `isDismissed`, `isLoading`
  - [ ] Render: Card with icon, message, "Create notes" & "Dismiss" buttons
  - [ ] Fixed position: bottom-right, z-index 40
  - [ ] Handle dismissal → localStorage write
  - [ ] Return null if dismissed or no activity
  - [ ] Proper cleanup (set cancelled flag)

### localStorage Key Format
```
cautie:notes-reminder:dismissed:${topicId}
```
Value: timestamp (number), TTL: 30 days

### Integration Points
- [ ] Add `NotesReminder` to quiz results page
  - [ ] Extract `topicId` from quiz context
  - [ ] Pass props: `topicId`, `topicTitle`
- [ ] Add `NotesReminder` to class page (if viewing specific topic)
  - [ ] Extract `topicId` from URL params
  - [ ] Conditionally render if topicId exists
- [ ] Add `NotesReminder` to flashcard session results
  - [ ] Extract topic from flashcard set metadata

### Testing
- [ ] Unit test: Dismissal flag logic (set/get/expire)
- [ ] Unit test: localStorage TTL calculation
- [ ] Integration test: Notes check endpoint returns correct data
- [ ] Manual test: Complete quiz, reminder appears
- [ ] Manual test: Click "Dismiss", localStorage is set
- [ ] Manual test: Refresh page, reminder doesn't appear
- [ ] Manual test: Wait 30+ days (simulate), reminder reappears
- [ ] Manual test: Click "Create notes", can navigate away and return

---

## Types Update: `/app/lib/types.ts`

Add at the end of file:

```typescript
// Copy from ANALYTICS_IMPLEMENTATION_DETAILS.md section 3.1
// StudentTopicScore
// StudentPerformanceTrend
// StudentAnalyticsDetail
// QuestionAnalysisDetail
// QuizMetric
// TopicErrorRate
// TeacherAnalyticsDetail
// NotesCheckResponse
```

- [ ] Add all 8 type definitions
- [ ] Verify imports in consuming files
- [ ] No TypeScript errors after adding

---

## Database Considerations

### Assumed Tables (Should Exist)
- [ ] `student_answers` (id, student_id, block_id, score, is_correct, submitted_at)
- [ ] `blocks` (id, assignment_id, type)
- [ ] `assignments` (id, class_id, paragraph_id, title)
- [ ] `paragraphs` (id, chapter_id, title)
- [ ] `chapters` (id, subject_id, title)
- [ ] `subjects` (id, title)
- [ ] `class_members` (class_id, user_id)

### Possible New Table (Optional)
- [ ] `student_notes` (id, student_id, topic_id, content, created_at, updated_at)
  - If this doesn't exist, `/api/student/notes/check` will assume `hasNotes=false` by default
  - Plan migration when ready

### Index Recommendations (Optional but Recommended)
```sql
CREATE INDEX idx_student_answers_student_id_submitted_at 
  ON student_answers(student_id, submitted_at);
CREATE INDEX idx_student_answers_block_id 
  ON student_answers(block_id);
```

- [ ] Check existing indexes with `\di` in psql
- [ ] Create indexes if missing (optional, but helps with large tables)

---

## File Creation Summary

Total new files: **13**

### API Routes (3)
- [ ] `/app/api/student/analytics/detailed/route.ts`
- [ ] `/app/api/student/notes/check/route.ts`
- [ ] `/app/api/classes/[classId]/analytics/detailed/route.ts`

### Component Files (8)
- [ ] `/app/components/analytics/StudentAnalyticsCharts.tsx`
- [ ] `/app/components/analytics/TopicScoreCard.tsx`
- [ ] `/app/components/analytics/PerformanceSummary.tsx`
- [ ] `/app/components/analytics/TeacherAnalyticsFilters.tsx`
- [ ] `/app/components/analytics/QuizPerformanceTable.tsx`
- [ ] `/app/components/analytics/ErrorRateChart.tsx`
- [ ] `/app/components/analytics/QuestionAnalysisDetail.tsx`
- [ ] `/app/components/analytics/ClassMetaMetricsCard.tsx`
- [ ] `/app/components/notes/NotesReminder.tsx`

### Page Files (1)
- [ ] `/app/(main)/analytics/teacher/page.tsx`

### Modified Files (2)
- [ ] `/app/(main)/analytics/page.tsx` (add tabs, components, state)
- [ ] `/app/lib/types.ts` (add 8 new type definitions)

---

## Implementation Order (Recommended)

**Fastest to slowest, best to implement in this order:**

1. ✅ Phase 3.2: `/api/student/notes/check` - **30 min**
   - Simple query, no aggregation
   - Enables early testing of API structure

2. ✅ Phase 3.1: `NotesReminder` component - **1.5 hours**
   - Depends on Phase 3.2
   - Self-contained, easy to test in isolation

3. ✅ Phase 1.1: `/api/student/analytics/detailed` - **2 hours**
   - Complex aggregation, but independent
   - Implement helper functions step-by-step

4. ✅ Phase 1.2: Student analytics page + components - **2.5 hours**
   - Depends on Phase 1.1
   - Build components bottom-up (Summary → Cards → Page)

5. ✅ Phase 2.1: `/api/classes/[classId]/analytics/detailed` - **2.5 hours**
   - Similar to Phase 1.1, but with more grouping
   - Reuse patterns from Phase 1.1

6. ✅ Phase 2.2: Teacher analytics page + components - **3 hours**
   - Depends on Phase 2.1
   - Most complex UI (table + filters + charts)

7. ✅ Phase 3 Integration: Add `NotesReminder` to pages - **1 hour**
   - Depends on Phase 3.1
   - Straightforward prop passing

**Total: ~14 hours**

---

## Common Pitfalls & Preventative Measures

| Pitfall | Prevention |
|---------|-----------|
| N+1 queries in aggregation | Use Supabase `select()` with all joins in one call |
| Nested relation is array vs object | Use `.?.[0]?.` pattern to safely access |
| Missing score field → use is_correct boolean | Use `score ?? (is_correct ? 100 : 0)` pattern |
| localStorage key collision | Use namespace prefix: `cautie:notes-reminder:` |
| Cache doesn't invalidate on quiz submission | Set TTL to 1 hour, accept stale data |
| Common mistakes extraction fails on JSON | Check `answer_data` type, use try-catch |
| Teacher sees other teachers' classes | Always check `class_members` WHERE current user |
| Dismissal flag doesn't expire | Implement TTL check with 30-day threshold |
| Charts render empty with 0 data | Return empty arrays, show placeholder message |

---

## Testing Checklist

### Before Committing Each Phase:

**Phase 1:**
- [ ] Student with 0 quizzes → analytics show empty state
- [ ] Student with 1 quiz → appears in topic aggregation
- [ ] Student with 20+ quizzes across 5 topics → correct aggregates
- [ ] Chart renders with data + tooltip works
- [ ] Strong/weak topics correctly sorted
- [ ] Improvement rate calculates correctly

**Phase 2:**
- [ ] Teacher with 0 students → endpoint returns empty structure
- [ ] Class with 1 student, 1 quiz → metrics calculated
- [ ] Expand quiz row → question detail appears
- [ ] Filter by topic → metrics update correctly
- [ ] Common mistakes shown for open questions (max 3)
- [ ] Histogram sorts by error rate correctly

**Phase 3:**
- [ ] Reminder doesn't show if user never did quiz on topic
- [ ] Reminder shows after 1 quiz completion on topic
- [ ] Dismiss → localStorage set to current timestamp
- [ ] Refresh → reminder hidden (localStorage checked)
- [ ] Simulate 31 days → reminder shows again (TTL expired)
- [ ] Click "Create notes" → navigable without errors

---

## Monitoring & Observability

### Logging Points

Add to API endpoints:
```typescript
console.log(`[Student Analytics] Fetching detailed for userId=${userId}`)
console.log(`[Student Analytics] Found ${answers.length} answers`)
console.log(`[Student Analytics] Aggregated into ${scoresByTopic.length} topics`)
```

### Error Tracking

Monitor these in your error service:
- `NotesCheck: student_notes table not found` → gracefully handled
- `StudentAnalytics: Empty answers array` → check if student has any quizzes
- `TeacherAnalytics: Access denied` → verify class membership logic

### Performance Metrics

Track in your analytics:
- API response time for `/api/student/analytics/detailed`
- API response time for `/api/classes/[classId]/analytics/detailed`
- Chart render time (recharts)
- localStorage write time (should be <5ms)

---

## Future Enhancements (Post-MVP)

- [ ] Export analytics as PDF
- [ ] AI-powered recommendations based on weak topics
- [ ] Predictive analytics (likelihood of struggling)
- [ ] Real-time dashboard with WebSocket
- [ ] Benchmark against class/school averages
- [ ] Topic-wise study plan recommendations
- [ ] Weekly email digest of analytics
- [ ] Student goal-setting (e.g., "Improve Math to 80%")

---

## Sign-Off & Next Steps

**Implementation Status**: Ready to start  
**Estimated Completion**: 14 hours  
**Blocking Issues**: None identified

**Next action**: Start with Phase 3.2 (simplest), which unblocks 3.1 and gives confidence on API structure.

---

**Last Updated**: June 22, 2026  
**Prepared by**: Claude Code
