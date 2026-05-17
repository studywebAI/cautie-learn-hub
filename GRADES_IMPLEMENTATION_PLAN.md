# 🚀 Grades Tab - Implementation Plan

## QUICK SUMMARY
Move grades from class settings to standalone `Grades` tab on sidebar with:
1. Main landing page (New / Existing buttons)
2. Multi-step wizard for creating grades
3. List view of all grades with status
4. Detailed grading interface per grade set
5. Import/Export functionality

---

## FILE STRUCTURE

```
app/(main)/grades/
├── page.tsx                          # Main landing page
├── new/
│   ├── page.tsx                      # Multi-step wizard
│   ├── step-1-class.tsx              # Select class
│   ├── step-2-settings.tsx           # Configure settings
│   └── step-3-grading.tsx            # Grading interface
├── [gradeId]/
│   ├── page.tsx                      # Grade details view
│   └── grading.tsx                   # Grading interface for existing
└── components/
    ├── grade-card.tsx                # Reusable grade card
    ├── grading-table.tsx             # Student grading table
    ├── grade-stats.tsx               # Progress & stats display
    ├── grade-filter-tabs.tsx         # Filter/sort controls
    ├── import-export.tsx             # CSV import/export
    └── step-progress.tsx             # Visual step indicator
```

---

## DATABASE SCHEMA (Already exists from migrations)

```sql
-- Grade Sets
CREATE TABLE grade_sets (
  id UUID PRIMARY KEY,
  class_id UUID REFERENCES classes(id),
  title TEXT NOT NULL,
  subject_id UUID REFERENCES subjects(id),
  weight DECIMAL(3,1) NOT NULL DEFAULT 5,
  frequency TEXT DEFAULT 'once',  -- 'once', 'weekly', 'biweekly', 'monthly'
  description TEXT,
  status TEXT DEFAULT 'draft',  -- 'draft', 'in_progress', 'completed'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);

-- Student Grades (individual grades)
CREATE TABLE student_grades (
  id UUID PRIMARY KEY,
  grade_set_id UUID REFERENCES grade_sets(id),
  student_id UUID REFERENCES users(id),
  grade_numeric DECIMAL(2,1),  -- 0-10 scale
  grade_value TEXT,            -- Alternative: letter grade
  feedback TEXT,               -- Teacher feedback
  graded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## COMPONENT BREAKDOWN

### 1. Main Page (`app/(main)/grades/page.tsx`)

**Logic:**
- Fetch all grade sets for teacher's classes
- Show "New Grade" and "Existing Grades" buttons
- Display recent grades (last 3-5)
- Show quick stats (total grades, avg completion, etc.)

**State:**
```typescript
const [grades, setGrades] = useState<GradeSet[]>([]);
const [recentGrades, setRecentGrades] = useState<GradeSet[]>([]);
const [loading, setLoading] = useState(true);
```

**Rendering:**
```tsx
return (
  <div className="space-y-6">
    {/* Header */}
    <div>
      <h1>📊 Grades</h1>
      <p>Welcome back, {teacher.name}</p>
    </div>

    {/* Action Buttons */}
    <div className="grid grid-cols-2 gap-4 md:gap-6">
      <Link href="/grades/new">
        <Card className="cursor-pointer hover:shadow-lg">
          <div className="text-center p-8">
            <span className="text-4xl">➕</span>
            <h3>New Grade</h3>
            <p>Create a new grade set</p>
          </div>
        </Card>
      </Link>
      
      <Link href="/grades?view=all">
        <Card className="cursor-pointer hover:shadow-lg">
          <div className="text-center p-8">
            <span className="text-4xl">📋</span>
            <h3>Existing Grades</h3>
            <p>View & manage grades</p>
          </div>
        </Card>
      </Link>
    </div>

    {/* Recent Grades */}
    {recentGrades.length > 0 && (
      <div>
        <h2>📌 Recent Grades</h2>
        <div className="space-y-3">
          {recentGrades.map(grade => (
            <GradeCard key={grade.id} grade={grade} />
          ))}
        </div>
      </div>
    )}
  </div>
);
```

---

### 2. Step 1: Select Class (`components/grades/step-1-class.tsx`)

**Input:**
- Fetch user's classes
- Show list with student count

**State:**
```typescript
const [selectedClassId, setSelectedClassId] = useState<string>('');
const [classes, setClasses] = useState<ClassInfo[]>([]);
```

**Rendering:**
```tsx
return (
  <div className="space-y-6">
    <h2>Step 1 of 3: Select Class</h2>
    <p>Which class is this grade for?</p>
    
    <div className="space-y-2">
      {classes.map(cls => (
        <button
          key={cls.id}
          onClick={() => setSelectedClassId(cls.id)}
          className={`w-full p-4 text-left border rounded-lg ${
            selectedClassId === cls.id ? 'border-accent bg-accent/10' : ''
          }`}
        >
          <div className="font-semibold">{cls.name}</div>
          <div className="text-sm text-muted">📚 {cls.student_count} students</div>
        </button>
      ))}
    </div>

    <div className="flex gap-2 justify-end">
      <Button onClick={onBack}>Back</Button>
      <Button 
        onClick={() => onNext(selectedClassId)}
        disabled={!selectedClassId}
      >
        Next →
      </Button>
    </div>
  </div>
);
```

---

### 3. Step 2: Configure Settings (`components/grades/step-2-settings.tsx`)

**Inputs:**
- Title (required, max 100 chars)
- Subject (dropdown, optional, multi-select)
- Weight (0.1-10, decimal)
- Frequency (dropdown: once, weekly, biweekly, monthly)
- Description (textarea, optional)

**State:**
```typescript
const [formData, setFormData] = useState({
  title: '',
  subjectId: '',
  weight: 5,
  frequency: 'once',
  description: ''
});

const [subjects, setSubjects] = useState<Subject[]>([]);
const [errors, setErrors] = useState<Record<string, string>>({});
```

**Validation:**
```typescript
const validate = () => {
  const newErrors: Record<string, string> = {};
  
  if (!formData.title.trim()) {
    newErrors.title = 'Title is required';
  }
  if (formData.title.length > 100) {
    newErrors.title = 'Max 100 characters';
  }
  if (formData.weight < 0.1 || formData.weight > 10) {
    newErrors.weight = 'Weight must be between 0.1 and 10';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Rendering:**
```tsx
return (
  <div className="space-y-6">
    <h2>Step 2 of 3: Configure Grade Settings</h2>

    <div className="p-4 bg-surface rounded-lg">
      <span className="text-sm">Class:</span>
      <span className="font-semibold">{selectedClass.name}</span>
      <button className="text-sm text-accent">[Change]</button>
    </div>

    {/* Title */}
    <div>
      <label>📝 Grade Title *</label>
      <Input
        value={formData.title}
        onChange={(e) => setFormData({...formData, title: e.target.value})}
        placeholder="e.g., Biology Test 1"
        maxLength={100}
      />
      {errors.title && <span className="text-red-500">{errors.title}</span>}
    </div>

    {/* Subject */}
    <div>
      <label>🏷️ Subject/Topic</label>
      <Select value={formData.subjectId} onValueChange={(v) => setFormData({...formData, subjectId: v})}>
        <SelectTrigger>
          <SelectValue placeholder="Select Subject" />
        </SelectTrigger>
        <SelectContent>
          {subjects.map(subject => (
            <SelectItem key={subject.id} value={subject.id}>
              {subject.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Weight */}
    <div>
      <label>⚖️ Weight/Points *</label>
      <div className="flex gap-2">
        <Button 
          size="sm"
          onClick={() => setFormData({...formData, weight: Math.max(0.1, formData.weight - 0.5)})}
        >
          −
        </Button>
        <Input
          type="number"
          value={formData.weight}
          onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value)})}
          step={0.5}
          min={0.1}
          max={10}
          className="text-center"
        />
        <Button 
          size="sm"
          onClick={() => setFormData({...formData, weight: Math.min(10, formData.weight + 0.5)})}
        >
          +
        </Button>
      </div>
      <span className="text-xs text-muted">(0.1 - 10)</span>
    </div>

    {/* Frequency */}
    <div>
      <label>📅 Frequency</label>
      <Select value={formData.frequency} onValueChange={(v) => setFormData({...formData, frequency: v})}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="once">One-time</SelectItem>
          <SelectItem value="weekly">Every Week</SelectItem>
          <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Description */}
    <div>
      <label>📋 Description (Optional)</label>
      <Textarea
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
        rows={3}
        placeholder="Add any instructions or notes for students..."
      />
    </div>

    <div className="flex gap-2 justify-end">
      <Button onClick={onBack}>Back</Button>
      <Button onClick={() => validate() && onNext(formData)}>
        Next →
      </Button>
    </div>
  </div>
);
```

---

### 4. Step 3: Grading Interface (`components/grades/step-3-grading.tsx`)

**Logic:**
- Fetch all students in class
- Show searchable, filterable list
- Each row has grade input field
- Real-time grade entry with auto-save
- Show progress bar and statistics

**State:**
```typescript
const [students, setStudents] = useState<StudentWithGrade[]>([]);
const [grades, setGrades] = useState<Record<string, number>>({});
const [search, setSearch] = useState('');
const [filterStatus, setFilterStatus] = useState('all'); // all, graded, ungraded
const [sortBy, setSortBy] = useState('name'); // name, date, grade
```

**Grade Entry:**
```typescript
const handleGradeChange = async (studentId: string, gradeValue: number | null) => {
  // Update local state
  setGrades(prev => ({...prev, [studentId]: gradeValue}));
  
  // Auto-save to API
  await fetch(`/api/grades/${gradeSetId}/students/${studentId}`, {
    method: 'POST',
    body: JSON.stringify({ grade: gradeValue })
  });
};
```

**Rendering:**
```tsx
return (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2>{gradeSetData.title}</h2>
      <Button onClick={handleSave}>Save & Done</Button>
    </div>

    {/* Grade Info */}
    <div className="p-3 bg-surface text-sm space-y-1">
      <div>Class: {gradeSetData.className}</div>
      <div>Weight: {gradeSetData.weight} pts | Subject: {gradeSetData.subject} | {gradeSetData.frequency}</div>
    </div>

    {/* Search & Filter */}
    <div className="space-y-3">
      <Input
        placeholder="🔍 Search students..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      <div className="flex gap-2">
        <button 
          onClick={() => setFilterStatus('all')}
          className={filterStatus === 'all' ? 'active' : ''}
        >
          All ({students.length})
        </button>
        <button 
          onClick={() => setFilterStatus('graded')}
          className={filterStatus === 'graded' ? 'active' : ''}
        >
          Graded ({gradedCount})
        </button>
        <button 
          onClick={() => setFilterStatus('ungraded')}
          className={filterStatus === 'ungraded' ? 'active' : ''}
        >
          Not Graded ({students.length - gradedCount})
        </button>
      </div>

      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">By Name</SelectItem>
          <SelectItem value="date">Most Recent</SelectItem>
          <SelectItem value="grade">By Grade</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Grading Table */}
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Student Name</th>
            <th className="text-center p-2 w-20">Grade</th>
            <th className="text-center p-2 w-20">Date</th>
            <th className="text-center p-2 w-20">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.map(student => (
            <tr key={student.id} className="border-b hover:bg-surface">
              <td className="p-2">{student.name}</td>
              <td className="text-center p-2">
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={grades[student.id] ?? ''}
                  onChange={(e) => handleGradeChange(student.id, e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full text-center"
                  placeholder="-"
                />
              </td>
              <td className="text-center p-2 text-xs text-muted">
                {grades[student.id] ? new Date().toLocaleDateString() : '-'}
              </td>
              <td className="text-center p-2">
                {grades[student.id] ? (
                  <button className="text-green-600">✓</button>
                ) : (
                  <button className="text-muted">○</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Summary */}
    <div className="p-4 bg-surface rounded-lg">
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-muted">Graded</span>
          <div className="font-bold text-lg">{gradedCount} / {students.length}</div>
        </div>
        <div>
          <span className="text-muted">Average</span>
          <div className="font-bold text-lg">{averageGrade.toFixed(1)}</div>
        </div>
        <div>
          <span className="text-muted">Progress</span>
          <ProgressBar value={(gradedCount / students.length) * 100} />
        </div>
      </div>
    </div>

    <div className="flex gap-2 justify-end">
      <Button onClick={handleSave} variant="default">
        Save & Close
      </Button>
    </div>
  </div>
);
```

---

## API ENDPOINTS

### GET /api/grades
Fetch all grade sets for teacher
```
Response: {
  grades: GradeSet[],
  total: number
}
```

### POST /api/grades
Create new grade set
```
Body: {
  class_id: string,
  title: string,
  subject_id?: string,
  weight: number,
  frequency: string,
  description?: string
}
Response: { grade_id: string }
```

### GET /api/grades/:gradeId
Fetch single grade set with students and grades
```
Response: {
  grade: GradeSet,
  students: StudentWithGrade[],
  stats: {
    graded_count: number,
    average: number,
    distribution: Record<number, number>
  }
}
```

### POST /api/grades/:gradeId/students/:studentId
Save individual grade
```
Body: { grade: number | null }
Response: { success: boolean }
```

### POST /api/grades/:gradeId/import
Bulk import grades from CSV
```
Body: FormData with CSV file
Response: { imported: number, errors: string[] }
```

### GET /api/grades/:gradeId/export
Export grades as CSV
```
Response: CSV file download
```

---

## SIDEBAR UPDATE

Add new menu item in `app/layout.tsx`:

```tsx
<nav className="space-y-2">
  <Link href="/dashboard">Dashboard</Link>
  <Link href="/subjects">Subjects</Link>
  <Link href="/classes">Classes</Link>
  <Link href="/grades">📊 Grades</Link>  {/* ← NEW */}
  <Link href="/agenda">Agenda</Link>
  <Link href="/studyset">Studyset</Link>
  {/* ... rest of menu */}
</nav>
```

---

## MIGRATION NOTES

### Move from class settings:
1. Remove grades section from `app/components/class-settings.tsx`
2. Keep class-level grade view accessible via Grades tab
3. Update class details page to link to Grades tab for that class

### Update existing grade queries:
- Any code fetching grades from `api/classes/:id/grades` now also available at `/api/grades`
- Keep both endpoints for backward compatibility

---

## IMPLEMENTATION ORDER

1. ✅ Create page structure (main, step 1-3 pages) — DONE (May 15)
2. ✅ Build UI components (cards, tables, forms) — DONE (May 15)
3. ✅ Connect to existing API endpoints — DONE (May 15)
4. ✅ Add grade entry & auto-save logic — DONE (May 15)
5. ✅ Add search, filter, sort functionality — DONE (May 15)
6. 🔜 Import/export (CSV) — placeholder buttons added, logic pending
7. ✅ Add stats & progress tracking — DONE (May 15)
8. ✅ Style for dark mode compatibility — DONE (surface-panel, theme-aware classes)
9. 🔜 Test on mobile/tablet/desktop — pending
10. 🔜 Deploy & monitor — pending

---

## FILES CREATED (May 15)

### Pages
- `app/(main)/teacher-grades/page.tsx` — Landing page (New Grade + Existing Grades + Recent Grades)
- `app/(main)/teacher-grades/new/page.tsx` — Multi-step wizard shell (step 1→2→3)
- `app/(main)/teacher-grades/new/step-1-select-class.tsx` — Class picker
- `app/(main)/teacher-grades/new/step-2-configure-settings.tsx` — Title, subject, weight, frequency, description
- `app/(main)/teacher-grades/new/step-3-grading-interface.tsx` — Enter grades during creation
- `app/(main)/teacher-grades/[gradeId]/page.tsx` — Grade details + stats + distribution
- `app/(main)/teacher-grades/[gradeId]/grading/page.tsx` — Full grading interface for existing grades

### API Endpoints
- `app/api/classes/[classId]/students/route.ts` — GET students in a class (new)
- `app/api/classes/[classId]/grades/[gradeSetId]/students/[studentId]/route.ts` — POST/GET individual grade (new)

---

## TESTING CHECKLIST

- [ ] Can create new grade set (all 3 wizard steps complete)
- [ ] Step 1: Shows correct classes
- [ ] Step 2: Loads subjects per class, validates required fields
- [ ] Step 3: Shows students, grade inputs work
- [ ] Grade saves to database via POST
- [x] Can view existing grades on landing page
- [ ] Can open grade detail page with stats
- [ ] Can continue grading from detail page
- [ ] Search/filter works in grading table
- [ ] Sort works (by name, by grade)
- [ ] Progress bar updates as grades are entered
- [ ] Statistics (avg, distribution) calculate correctly
- [x] Dark mode styling correct
- [ ] Import CSV — pending
- [ ] Export CSV — pending
- [ ] Fast load times (< 2s)
- [ ] No console errors

---

## FUTURE ENHANCEMENTS

1. **Rubric grading** - Define grading rubric, apply to grades
2. **Bulk feedback** - Add comments to multiple students
3. **Grade curves** - Auto-adjust grades based on class performance
4. **Rubric templates** - Save & reuse rubric across courses
5. **Analytics** - Grade trends, student progress tracking
6. **Integration** - Sync with Google Classroom, PowerSchool
7. **Peer review** - Students review each other's work
8. **Late submission handling** - Flag late submissions
9. **Grade history** - Full audit log of all changes
10. **Weighted calculation** - Auto-calculate final grade from weighted grades
