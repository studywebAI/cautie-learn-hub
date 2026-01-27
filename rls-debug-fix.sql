-- Temporary debug fix - allow all authenticated users to read all profiles
-- This will fix the 406 errors so we can test the role logic

DROP POLICY IF EXISTS "Allow read access for users and teachers" ON "public"."profiles";
DROP POLICY IF EXISTS "Allow individual read access" ON "public"."profiles";

-- Temporary permissive policy for debugging
CREATE POLICY "Allow authenticated users to read all profiles" ON "public"."profiles" FOR SELECT USING (auth.role() = 'authenticated');

-- Keep the existing insert and update policies
-- CREATE POLICY "Allow individual insert access" ON "public"."profiles" FOR INSERT WITH CHECK (auth.uid() = id);
-- CREATE POLICY "Allow individual update access" ON "public"."profiles" FOR UPDATE USING (auth.uid() = id);