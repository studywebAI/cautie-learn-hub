-- FIX THE EXISTING POLICY ISSUE

-- Drop the problematic existing policy
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.classes;

-- Recreate it properly
CREATE POLICY "Allow all for authenticated users" ON public.classes FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);