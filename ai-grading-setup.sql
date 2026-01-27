-- AI Grading Setup
-- Add tables and functions for AI grading system

-- Grading Jobs Table
CREATE TABLE IF NOT EXISTS public.grading_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_answer_id UUID NOT NULL REFERENCES public.student_answers(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error_message TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grading_jobs_status ON public.grading_jobs(status);
CREATE INDEX IF NOT EXISTS idx_grading_jobs_student_answer ON public.grading_jobs(student_answer_id);

-- RLS
ALTER TABLE public.grading_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view their grading jobs" ON public.grading_jobs FOR SELECT USING (
    auth.uid() = (SELECT student_id FROM student_answers WHERE id = grading_jobs.student_answer_id)
);
CREATE POLICY "Teachers can view grading jobs for their classes" ON public.grading_jobs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM student_answers sa
        JOIN blocks b ON sa.block_id = b.id
        JOIN assignments a ON b.assignment_id = a.id
        JOIN paragraphs p ON a.paragraph_id = p.id
        JOIN chapters c ON p.chapter_id = c.id
        JOIN subjects s ON c.subject_id = s.id
        JOIN classes cl ON s.class_id = cl.id
        WHERE sa.id = grading_jobs.student_answer_id AND cl.owner_id = auth.uid()
    )
);
CREATE POLICY "System can manage grading jobs" ON public.grading_jobs FOR ALL USING (auth.uid() IS NOT NULL); -- Adjust for proper system access

-- Function to process grading jobs (call this periodically or via cron)
CREATE OR REPLACE FUNCTION process_grading_jobs()
RETURNS VOID AS $$
DECLARE
    job RECORD;
BEGIN
    -- Process one pending job at a time
    SELECT * INTO job FROM grading_jobs WHERE status = 'pending' ORDER BY created_at LIMIT 1 FOR UPDATE;

    IF job IS NOT NULL THEN
        -- Mark as processing
        UPDATE grading_jobs SET status = 'processing' WHERE id = job.id;

        -- Call the grading function (placeholder - implement actual AI call)
        -- For now, just mark as completed with dummy data
        UPDATE grading_jobs SET status = 'completed', processed_at = NOW() WHERE id = job.id;

        -- In real implementation, call AI grading here
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Verification
SELECT 'AI grading setup completed' as status;