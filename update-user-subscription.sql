-- Update user subscription to Pro tier for class creation
-- Replace 'e3f27594-b816-449f-81d3-063415a373c4' with your actual user ID if different

UPDATE profiles 
SET 
  subscription_type = 'teacher',
  subscription_tier = 'pro',
  classes_created = 0
WHERE id = 'e3f27594-b816-449f-81d3-063415a373c4';

-- Verify the update
SELECT id, subscription_type, subscription_tier, classes_created 
FROM profiles 
WHERE id = 'e3f27594-b816-449f-81d3-063415a373c4';