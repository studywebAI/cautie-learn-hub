-- Fix existing classes to work with new schema

-- Update existing classes to set user_id = owner_id if user_id is null
UPDATE public.classes
SET user_id = owner_id
WHERE user_id IS NULL AND owner_id IS NOT NULL;

-- Set owner_type based on whether guest_id exists
UPDATE public.classes
SET owner_type = CASE
    WHEN guest_id IS NOT NULL THEN 'guest'::text
    ELSE 'user'::text
END;

-- Update assignments to set user_id = the class owner
UPDATE public.assignments
SET user_id = classes.user_id
FROM public.classes
WHERE assignments.class_id = classes.id AND assignments.user_id IS NULL;

-- Set owner_type for assignments
UPDATE public.assignments
SET owner_type = CASE
    WHEN guest_id IS NOT NULL THEN 'guest'::text
    ELSE 'user'::text
END;

-- Re-enable RLS on classes and assignments
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Verify classes are accessible
SELECT
    c.id,
    c.name,
    c.owner_id,
    c.user_id,
    c.guest_id,
    c.owner_type,
    COUNT(cm.user_id) as member_count
FROM public.classes c
LEFT JOIN public.class_members cm ON c.id = cm.class_id
GROUP BY c.id, c.name, c.owner_id, c.user_id, c.guest_id, c.owner_type
ORDER BY c.created_at DESC;