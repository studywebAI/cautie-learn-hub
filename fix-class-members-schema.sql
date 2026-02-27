-- Fix class_members table schema - add missing joined_at column
-- This fixes the error: "column class_members.joined_at does not exist"

-- Check current class_members table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'class_members' 
ORDER BY column_name;

-- Add joined_at column if it doesn't exist
ALTER TABLE class_members 
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'class_members' AND column_name = 'joined_at';