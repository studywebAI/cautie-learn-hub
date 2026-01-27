-- Check assignments and their relationships
SELECT
  a.id,
  a.title,
  a.paragraph_id,
  a.assignment_index,
  a.created_at,
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
ORDER BY a.created_at DESC
LIMIT 20;

-- Check for orphaned assignments (assignments without paragraphs)
SELECT
  a.id,
  a.title,
  a.paragraph_id,
  a.created_at
FROM assignments a
LEFT JOIN paragraphs p ON a.paragraph_id = p.id
WHERE p.id IS NULL;

-- Check paragraphs that have assignments
SELECT
  p.id,
  p.title,
  COUNT(a.id) as assignment_count
FROM paragraphs p
LEFT JOIN assignments a ON p.id = a.paragraph_id
GROUP BY p.id, p.title
HAVING COUNT(a.id) > 0
ORDER BY assignment_count DESC;