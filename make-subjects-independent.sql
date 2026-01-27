-- Make subjects independent of classes
-- Alter subjects table to make class_id optional

ALTER TABLE "public"."subjects" ALTER COLUMN "class_id" DROP NOT NULL;

-- Update RLS policies to allow subjects without class association
-- (Keep existing policies but also allow global subjects)

-- Drop old policies
DROP POLICY IF EXISTS "subjects_select_policy" ON subjects;
DROP POLICY IF EXISTS "subjects_insert_policy" ON subjects;
DROP POLICY IF EXISTS "subjects_update_policy" ON subjects;
DROP POLICY IF EXISTS "subjects_delete_policy" ON subjects;

-- New policies that allow both class-associated and global subjects
CREATE POLICY "subjects_select_policy" ON subjects
    FOR SELECT USING (
        user_id = auth.uid()
        OR
        (class_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM classes c
            JOIN class_members cm ON cm.class_id = c.id
            WHERE c.id = subjects.class_id
            AND cm.user_id = auth.uid()
        ))
    );

CREATE POLICY "subjects_insert_policy" ON subjects
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND
        (class_id IS NULL OR EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = class_id
            AND (c.owner_id = auth.uid())
        ))
    );

CREATE POLICY "subjects_update_policy" ON subjects
    FOR UPDATE USING (
        user_id = auth.uid()
        OR
        (class_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = class_id
            AND c.owner_id = auth.uid()
        ))
    );

CREATE POLICY "subjects_delete_policy" ON subjects
    FOR DELETE USING (
        user_id = auth.uid()
        OR
        (class_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = class_id
            AND c.owner_id = auth.uid()
        ))
    );