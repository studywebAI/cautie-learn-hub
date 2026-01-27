-- Blocks Table: Stores blocks within materials
-- Drop existing table if it exists (clean slate approach)
DROP TABLE IF EXISTS public.blocks CASCADE;

CREATE TABLE public.blocks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    material_id uuid NOT NULL,
    content jsonb NOT NULL,
    type text NOT NULL,
    order_index integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT blocks_pkey PRIMARY KEY (id),
    CONSTRAINT blocks_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials (id) ON DELETE CASCADE
);

-- Enable RLS on blocks
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blocks
CREATE POLICY "Users can manage blocks for their materials" ON public.blocks FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.materials m
        WHERE m.id = blocks.material_id AND m.user_id = auth.uid()
    )
);