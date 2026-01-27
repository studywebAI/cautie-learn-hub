-- MANUAL SUPABASE SETUP - Run these commands one by one in Supabase SQL Editor

-- Step 1: Drop policies first
DROP POLICY IF EXISTS "Allow authenticated insert" ON "public"."assignments";
DROP POLICY IF EXISTS "Allow authenticated read" ON "public"."assignments";
DROP POLICY IF EXISTS "Allow authenticated delete for owners" ON "public"."assignments";
DROP POLICY IF EXISTS "Allow authenticated update for owners" ON "public"."assignments";
DROP POLICY IF EXISTS "Allow authenticated read" ON "public"."class_members";
DROP POLICY IF EXISTS "Allow authenticated insert" ON "public"."class_members";
DROP POLICY IF EXISTS "Allow authenticated delete for owners" ON "public"."class_members";
DROP POLICY IF EXISTS "Allow authenticated read" ON "public"."classes";
DROP POLICY IF EXISTS "Allow authenticated insert" ON "public"."classes";
DROP POLICY IF EXISTS "Allow authenticated update for owners" ON "public"."classes";
DROP POLICY IF EXISTS "Allow authenticated delete for owners" ON "public"."classes";
DROP POLICY IF EXISTS "Allow individual read access" ON "public"."profiles";
DROP POLICY IF EXISTS "Allow individual insert access" ON "public"."profiles";
DROP POLICY IF EXISTS "Allow individual update access" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can manage their own materials" ON "public"."materials";
DROP POLICY IF EXISTS "Users can view public materials" ON "public"."materials";
DROP POLICY IF EXISTS "Students can view their own submissions" ON "public"."submissions";
DROP POLICY IF EXISTS "Students can insert their own submissions" ON "public"."submissions";
DROP POLICY IF EXISTS "Students can update their own submissions" ON "public"."submissions";
DROP POLICY IF EXISTS "Teachers can view submissions for their assignments" ON "public"."submissions";
DROP POLICY IF EXISTS "Teachers can grade submissions for their assignments" ON "public"."submissions";

-- Step 2: Drop trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 3: Drop tables (this will cascade and remove all data)
DROP TABLE IF EXISTS "public"."submissions" CASCADE;
DROP TABLE IF EXISTS "public"."student_answers" CASCADE;
DROP TABLE IF EXISTS "public"."session_logs" CASCADE;
DROP TABLE IF EXISTS "public"."progress_snapshots" CASCADE;
DROP TABLE IF EXISTS "public"."blocks" CASCADE;
DROP TABLE IF EXISTS "public"."assignments" CASCADE;
DROP TABLE IF EXISTS "public"."paragraphs" CASCADE;
DROP TABLE IF EXISTS "public"."chapters" CASCADE;
DROP TABLE IF EXISTS "public"."subjects" CASCADE;
DROP TABLE IF EXISTS "public"."materials" CASCADE;
DROP TABLE IF EXISTS "public"."class_members" CASCADE;
DROP TABLE IF EXISTS "public"."classes" CASCADE;
DROP TABLE IF EXISTS "public"."profiles" CASCADE;