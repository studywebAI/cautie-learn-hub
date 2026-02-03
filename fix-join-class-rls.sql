-- Fix: Allow users to lookup classes by join_code (needed for join flow)
-- This is a targeted fix - not dropping existing policies

-- Add policy to allow SELECT on classes when looking up by join_code
-- This allows the join page to find a class before the user is a member
CREATE POLICY "Anyone can lookup classes by join_code" 
ON public.classes 
FOR SELECT 
USING (join_code IS NOT NULL);

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
