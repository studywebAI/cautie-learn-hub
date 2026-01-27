-- Check the specific assignment from the URL
SELECT
  a.id,
  a.title,
  a.paragraph_id,
  a.assignment_index,
  a.created_at,
  a.answers_enabled,
  p.title as paragraph_title,
  p.chapter_id,
  c.title as chapter_title,
  c.subject_id,
  s.title as subject_title,
  s.class_id
FROM assignments a
LEFT JOIN paragraphs p ON a.paragraph_id = p.id
LEFT JOIN chapters c ON p.chapter_id = c.id
LEFT JOIN subjects s ON c.subject_id = s.id
WHERE a.id = '61ecd62a-519b-43ca-acb3-efd339063bdb';

-- Check what assignments belong to the paragraph from the URL
SELECT
  a.id,
  a.title,
  a.paragraph_id,
  a.assignment_index,
  a.created_at
FROM assignments a
WHERE a.paragraph_id = '6c8c3c4f-ac10-442c-af75-df05b6213ce3';

-- Check if there are any RLS policies that might be blocking access
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'assignments';