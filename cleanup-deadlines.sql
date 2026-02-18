-- Remove past due deadlines for pending assignments
DELETE FROM assignments 
WHERE deadline < NOW() 
  AND status = 'pending';

-- Remove duplicate edit buttons from teacher actions
-- This will be handled in the frontend code, not database