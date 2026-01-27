-- FINAL WORKING MIGRATION - Run this after complete-hierarchy-setup-fixed-final.sql

-- Skip paragraphs table creation (already done)
-- Just update assignments table structure

-- Make class_id optional and ensure paragraph_id is required
ALTER TABLE public.assignments ALTER COLUMN class_id DROP NOT NULL;
ALTER TABLE public.assignments ALTER COLUMN paragraph_id SET NOT NULL;

-- Add theme/language fields to user_preferences
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS color_palette TEXT DEFAULT 'default';

-- Assignment A-Z indexing functions
CREATE OR REPLACE FUNCTION assignment_index_to_letters(index INTEGER)
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    num INTEGER := index;
BEGIN
    IF num = 0 THEN RETURN 'a'; END IF;

    WHILE num >= 0 LOOP
        result := CHR(97 + (num % 26)) || result;
        num := num / 26 - 1;
        IF num < 0 THEN EXIT; END IF;
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_next_assignment_index(paragraph_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    next_index INTEGER;
BEGIN
    SELECT COALESCE(MAX(assignment_index), -1) + 1
    INTO next_index
    FROM public.assignments
    WHERE paragraph_id = paragraph_uuid;

    RETURN next_index;
END;
$$ LANGUAGE plpgsql;

-- Verification
SELECT
    'Migration completed!' as status,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'paragraph_id' AND is_nullable = 'NO') as paragraph_id_required,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'class_id' AND is_nullable = 'YES') as class_id_optional,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'theme') as theme_field_exists;