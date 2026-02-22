-- Migration: Cleanup old role column
-- The role column is now deprecated - use subscription_type instead
-- This migration syncs the role column with subscription_type for backward compatibility

-- Update role column to match subscription_type (for any out-of-sync data)
UPDATE profiles 
SET role = subscription_type 
WHERE role IS DISTINCT FROM subscription_type 
AND subscription_type IS NOT NULL;

-- For any profiles where subscription_type is NULL but role exists, 
-- set subscription_type to match role
UPDATE profiles 
SET subscription_type = role 
WHERE subscription_type IS NULL 
AND role IS NOT NULL;

-- Set default for any remaining NULL values
UPDATE profiles 
SET subscription_type = 'student' 
WHERE subscription_type IS NULL;

UPDATE profiles 
SET role = 'student' 
WHERE role IS NULL;

-- Note: We're keeping the role column for backward compatibility 
-- but it's now only updated via subscription system
