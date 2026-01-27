-- Fix RLS policies for profiles table to allow teachers to read class member profiles

-- First drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow individual read access" ON "public"."profiles";

-- Create new policy that allows:
-- 1. Users to read their own profile
-- 2. Teachers to read profiles of their class members
CREATE POLICY "Allow read access for users and teachers" ON "public"."profiles" FOR SELECT USING (
  auth.uid() = id OR
  EXISTS (
    SELECT 1 FROM class_members cm
    INNER JOIN classes c ON cm.class_id = c.id
    WHERE cm.user_id = profiles.id
    AND (
      c.owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM class_members cm2
        WHERE cm2.class_id = c.id AND cm2.user_id = auth.uid() AND (cm2.role = 'teacher' OR cm2.role = 'student')
      )
    )
  )
);

-- Keep the existing insert and update policies (they're already in the schema.sql file)
-- CREATE POLICY "Allow individual insert access" ON "public"."profiles" FOR INSERT WITH CHECK (auth.uid() = id);
-- CREATE POLICY "Allow individual update access" ON "public"."profiles" FOR UPDATE USING (auth.uid() = id);