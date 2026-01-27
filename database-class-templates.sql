-- Class Templates Migration
-- Add class templates table for reusable class structures

-- Create class_templates table
CREATE TABLE IF NOT EXISTS "public"."class_templates" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "description" text,
    "owner_id" uuid NOT NULL,
    "is_public" boolean DEFAULT false,
    "template_data" jsonb NOT NULL, -- Contains structure: chapters, assignments, etc.
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "class_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "class_templates_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS "class_templates_owner_id_idx" ON "public"."class_templates"("owner_id");
CREATE INDEX IF NOT EXISTS "class_templates_is_public_idx" ON "public"."class_templates"("is_public");

-- Enable RLS
ALTER TABLE "public"."class_templates" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own templates and public templates" ON "public"."class_templates" FOR SELECT USING (
  auth.uid() = owner_id OR is_public = true
);

CREATE POLICY "Users can insert their own templates" ON "public"."class_templates" FOR INSERT WITH CHECK (
  auth.uid() = owner_id
);

CREATE POLICY "Users can update their own templates" ON "public"."class_templates" FOR UPDATE USING (
  auth.uid() = owner_id
);

CREATE POLICY "Users can delete their own templates" ON "public"."class_templates" FOR DELETE USING (
  auth.uid() = owner_id
);