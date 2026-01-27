-- Comprehensive diagnostic for assignment loading issue

-- 1. Check if assignment exists
SELECT
  a.id,
  a.title,
  a.paragraph_id,
  a.created_at
FROM assignments a
WHERE a.id = '61ecd62a-519b-43ca-acb3-efd339063bdb';

-- 2. Check the full hierarchy path
SELECT
  a.id as assignment_id,
  a.title as assignment_title,
  p.id as paragraph_id,
  p.title as paragraph_title,
  p.chapter_id,
  c.title as chapter_title,
  c.subject_id,
  s.title as subject_title,
  s.class_id,
  cls.name as class_name,
  cls.owner_id as class_owner_id
FROM assignments a
JOIN paragraphs p ON a.paragraph_id = p.id
JOIN chapters c ON p.chapter_id = c.id
JOIN subjects s ON c.subject_id = s.id
LEFT JOIN classes cls ON s.class_id = cls.id
WHERE a.id = '61ecd62a-519b-43ca-acb3-efd339063bdb';

-- 3. Check if user has access to this class
SELECT
  cm.class_id,
  cm.user_id,
  cm.created_at,
  cls.name as class_name,
  cls.owner_id
FROM class_members cm
JOIN classes cls ON cm.class_id = cls.id
WHERE cm.user_id = '3d2e2b14-cdb9-4081-852f-2885e4043d58'  -- Current user ID from logs
AND cm.class_id IN (
  SELECT s.class_id
  FROM assignments a
  JOIN paragraphs p ON a.paragraph_id = p.id
  JOIN chapters c ON p.chapter_id = c.id
  JOIN subjects s ON c.subject_id = s.id
  WHERE a.id = '61ecd62a-519b-43ca-acb3-efd339063bdb'
);

-- 4. Check RLS policies on assignments table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'assignments';

-- 5. Test the exact query used by assignments API
SELECT
  a.*,
  CASE WHEN COUNT(b.id) > 0 THEN json_agg(b.*) ELSE '[]'::json END as blocks
FROM assignments a
LEFT JOIN blocks b ON a.id = b.assignment_id
WHERE a.paragraph_id = '6c8c3c4f-ac10-442c-af75-df05b6213ce3'
GROUP BY a.id;

-- 6. Check user's role
SELECT id, role FROM profiles WHERE id = '3d2e2b14-cdb9-4081-852f-2885e4043d58';