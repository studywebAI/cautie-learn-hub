-- Test script to verify subscription update functionality
-- This will help debug if the database update is working

-- First, check current subscription status
SELECT id, subscription_type, subscription_tier, subscription_code_used 
FROM profiles 
WHERE id = 'e3f27594-b816-449f-81d3-063415a373c4';

-- Test the update manually (this simulates what the API should do)
UPDATE profiles 
SET 
  subscription_type = 'teacher',
  subscription_tier = 'pro',
  subscription_code_used = 'm8sk0l'
WHERE id = 'e3f27594-b816-449f-81d3-063415a373c4';

-- Verify the update worked
SELECT id, subscription_type, subscription_tier, subscription_code_used 
FROM profiles 
WHERE id = 'e3f27594-b816-449f-81d3-063415a373c4';

-- Test RLS policy by trying to update as the user
-- This should work if RLS is configured correctly
-- Note: This requires being authenticated as the user
-- UPDATE profiles 
-- SET subscription_tier = 'premium'
-- WHERE id = 'e3f27594-b816-449f-81d3-063415a373c4';