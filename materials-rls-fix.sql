-- Fix Materials RLS Policies
-- Add policies to allow class members to view and class owners to manage class materials

-- Drop existing materials policies if they exist
DROP POLICY IF EXISTS "Users can manage their own materials" ON public.materials;
DROP POLICY IF EXISTS "Users can view public materials" ON public.materials;
DROP POLICY IF EXISTS "Class members can view class materials" ON public.materials;
DROP POLICY IF EXISTS "Class owners can manage class materials" ON public.materials;

-- Materials RLS
CREATE POLICY "Users can manage their own materials" ON public.materials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view public materials" ON public.materials FOR SELECT USING (is_public = true);
CREATE POLICY "Class members can view class materials" ON public.materials FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = materials.class_id AND (
            c.owner_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.class_members cm
                WHERE cm.class_id = materials.class_id AND cm.user_id = auth.uid()
            )
        )
    )
);
CREATE POLICY "Class owners can manage class materials" ON public.materials FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = materials.class_id AND c.owner_id = auth.uid()
    )
);