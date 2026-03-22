from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

OUT_PATH = r"output/pdf/cautie-app-summary-one-pager.pdf"

c = canvas.Canvas(OUT_PATH, pagesize=letter)
width, height = letter

# Layout
margin_x = 46
y = height - 44
line = 13
section_gap = 8
bullet_indent = 14
max_width = width - (2 * margin_x)


def wrap_text(text, max_chars):
    words = text.split(' ')
    lines = []
    current = ''
    for w in words:
        test = (current + ' ' + w).strip()
        if len(test) <= max_chars:
            current = test
        else:
            if current:
                lines.append(current)
            current = w
    if current:
        lines.append(current)
    return lines


def heading(text):
    global y
    c.setFillColor(HexColor('#0f172a'))
    c.setFont('Helvetica-Bold', 12)
    c.drawString(margin_x, y, text)
    y -= line + 1


def paragraph(text, max_chars=105):
    global y
    c.setFillColor(HexColor('#111827'))
    c.setFont('Helvetica', 9.4)
    for ln in wrap_text(text, max_chars):
        c.drawString(margin_x, y, ln)
        y -= line


def bullet(text, max_chars=100):
    global y
    c.setFillColor(HexColor('#111827'))
    c.setFont('Helvetica', 9.2)
    lines = wrap_text(text, max_chars)
    if not lines:
        return
    c.drawString(margin_x, y, '- ' + lines[0])
    y -= line
    for ln in lines[1:]:
        c.drawString(margin_x + bullet_indent, y, ln)
        y -= line

# Header
c.setFillColor(HexColor('#0b1220'))
c.setFont('Helvetica-Bold', 16)
c.drawString(margin_x, y, 'Cautie Learn Hub: App Summary')
y -= 18
c.setFont('Helvetica', 8.5)
c.setFillColor(HexColor('#4b5563'))
c.drawString(margin_x, y, 'Generated from repository evidence in C:/Projects/cautie-learn-hub')
y -= 18

heading('What it is')
paragraph('Cautie is a Next.js learning platform with separate student and teacher experiences for classes, subjects, assignments, and study workflows. It combines standard class management with AI-powered study and grading tools exposed through in-app pages and API routes.')
y -= section_gap

heading("Who it's for")
paragraph('Primary persona: a student enrolled in teacher-managed classes; teacher workflows are also first-class (class creation, grading, attendance, and analytics).')
y -= section_gap

heading('What it does')
feature_bullets = [
    'Shows role-based dashboards for students and teachers with agenda, deadlines, analytics, and class summaries.',
    'Manages classes, memberships, invites/join flows, announcements, attendance, grades, and submissions.',
    'Organizes learning content in a hierarchy: subjects -> chapters -> paragraphs -> assignments/blocks.',
    'Provides AI tools for notes, quizzes, flashcards, grading, analytics, and content generation through named flows.',
    'Supports material upload/management plus assignment and progress tracking via dedicated routes.',
    'Includes toolbox v2 run orchestration with persisted runs/artifacts, entitlement checks, and usage metering.',
    'Offers a browser extension capture endpoint to save captured page content as imported content or personal tasks.'
]
for item in feature_bullets:
    bullet(item)
y -= section_gap

heading('How it works (repo-evidenced architecture)')
arch_bullets = [
    'Frontend: Next.js App Router pages under app/(main) and reusable React components under app/components.',
    'Client state: AppContext loads session and dashboard/navigation data, then calls internal API routes (for example /api/dashboard, /api/classes, /api/subjects).',
    'Backend: Route handlers in app/api/* execute domain logic and use Supabase server client with cookie-based auth.',
    'Data layer: Supabase PostgreSQL schema/migrations are under supabase/schema.sql and supabase/migrations/*.sql, with many feature SQL scripts in repo root.',
    'AI layer: app/lib/ai/flow-executor maps flow names to app/ai/flows/*; invoked by /api/ai/handle and /api/tools/v2/runs, with run/artifact persistence in database tables.'
]
for item in arch_bullets:
    bullet(item)
y -= section_gap

heading('How to run (minimal)')
run_bullets = [
    'Install dependencies: npm install',
    'Set env vars (required by code): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SECRET_KEY. Optional for AI/tools: GEMINI_API_KEY, OPENAI_API_KEY.',
    'Prepare database: run root script npm run db:setup (executes complete-hierarchy-setup-fixed-final.sql). For Toolbox v2 tables, docs/toolbox-v2.md requires running toolbox-v2-manual.sql in Supabase SQL Editor.',
    'Start app: npm run dev, then open http://localhost:9003',
    'Node.js version requirement: Not found in repo.'
]
for item in run_bullets:
    bullet(item, max_chars=98)

# Footer
c.setFont('Helvetica', 7.8)
c.setFillColor(HexColor('#6b7280'))
c.drawRightString(width - margin_x, 24, 'One-page summary')

c.showPage()
c.save()
print(OUT_PATH)
