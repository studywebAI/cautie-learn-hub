-- Check if the assignment's hierarchy matches the URL parameters
SELECT
  a.id as assignment_id,
  a.title as assignment_title,
  a.paragraph_id,
  p.title as paragraph_title,
  p.chapter_id,
  c.title as chapter_title,
  c.subject_id,
  s.title as subject_title,
  s.class_id
FROM assignments a
JOIN paragraphs p ON a.paragraph_id = p.id
JOIN chapters c ON p.chapter_id = c.id
JOIN subjects s ON c.subject_id = s.id
WHERE a.id = '61ecd62a-519b-43ca-acb3-efd339063bdb';

-- Check if the URL parameters are correct
-- Expected: subject=1c134472-ffd0-4496-ae12-0f2a2133626f, chapter=cd0bec06-9666-4fc1-a304-1fe8710a1bd4, paragraph=6c8c3c4f-ac10-442c-af75-df05b6213ce3
SELECT
  'URL subject ID matches DB' as check_result,
  s.id = '1c134472-ffd0-4496-ae12-0f2a2133626f' as subject_matches
FROM subjects s
WHERE s.id = '1c134472-ffd0-4496-ae12-0f2a2133626f'

UNION ALL

SELECT
  'URL chapter ID matches DB',
  c.id = 'cd0bec06-9666-4fc1-a304-1fe8710a1bd4'
FROM chapters c
WHERE c.id = 'cd0bec06-9666-4fc1-a304-1fe8710a1bd4'

UNION ALL

SELECT
  'URL paragraph ID matches DB',
  p.id = '6c8c3c4f-ac10-442c-af75-df05b6213ce3'
FROM paragraphs p
WHERE p.id = '6c8c3c4f-ac10-442c-af75-df05b6213ce3';