-- Check what subjects exist and their user_id values
SELECT
    id,
    title,
    user_id,
    class_id,
    created_at
FROM public.subjects
ORDER BY created_at DESC;

-- Check if subjects have user_id set (many might be null)
SELECT
    COUNT(*) as total_subjects,
    COUNT(user_id) as subjects_with_user_id,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as subjects_without_user_id
FROM public.subjects;

-- Show subjects without user_id (these won't appear in API)
SELECT id, title, class_id FROM public.subjects WHERE user_id IS NULL;