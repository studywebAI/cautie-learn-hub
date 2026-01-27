-- Check current profiles table schema
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if profiles table exists and has data
SELECT
    'Table exists' as check,
    COUNT(*) as row_count
FROM information_schema.tables
WHERE table_name = 'profiles' AND table_schema = 'public';

-- Check current user profile
SELECT * FROM public.profiles WHERE id = auth.uid();