-- Assessment Management System Migration
-- Adds grading categories, rubrics, and enhanced grading features

-- Create grading categories table for weighted grading
CREATE TABLE IF NOT EXISTS "public"."grading_categories" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "class_id" uuid NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "weight" numeric NOT NULL CHECK (weight > 0 AND weight <= 100),
    "color" text DEFAULT '#3b82f6',
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "grading_categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "grading_categories_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE,
    CONSTRAINT "unique_category_name_per_class" UNIQUE ("class_id", "name")
);

-- Create rubrics table
CREATE TABLE IF NOT EXISTS "public"."rubrics" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "class_id" uuid NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "total_points" numeric DEFAULT 0,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "rubrics_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rubrics_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE
);

-- Create rubric items table
CREATE TABLE IF NOT EXISTS "public"."rubric_items" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "rubric_id" uuid NOT NULL,
    "criterion" text NOT NULL,
    "description" text,
    "max_score" numeric NOT NULL DEFAULT 4,
    "weight" numeric DEFAULT 1,
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "rubric_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rubric_items_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "public"."rubrics"("id") ON DELETE CASCADE
);

-- Create submission rubric scores table
CREATE TABLE IF NOT EXISTS "public"."submission_rubric_scores" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" uuid NOT NULL,
    "rubric_item_id" uuid NOT NULL,
    "score" numeric NOT NULL,
    "feedback" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "submission_rubric_scores_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "submission_rubric_scores_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE CASCADE,
    CONSTRAINT "submission_rubric_scores_rubric_item_id_fkey" FOREIGN KEY ("rubric_item_id") REFERENCES "public"."rubric_items"("id") ON DELETE CASCADE,
    CONSTRAINT "unique_submission_rubric_item" UNIQUE ("submission_id", "rubric_item_id")
);

-- Add grading_category_id to assignments
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS grading_category_id uuid REFERENCES grading_categories(id) ON DELETE SET NULL;

-- Add rubric_id to assignments
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS rubric_id uuid REFERENCES rubrics(id) ON DELETE SET NULL;

-- Add max_points to assignments
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS max_points numeric DEFAULT 100;

-- Add calculated_grade to submissions (for weighted calculations)
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS calculated_grade numeric;

-- Add is_late to submissions
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS is_late boolean DEFAULT false;

-- Create indexes
CREATE INDEX IF NOT EXISTS "grading_categories_class_id_idx" ON "public"."grading_categories"("class_id");
CREATE INDEX IF NOT EXISTS "rubrics_class_id_idx" ON "public"."rubrics"("class_id");
CREATE INDEX IF NOT EXISTS "rubric_items_rubric_id_idx" ON "public"."rubric_items"("rubric_id");
CREATE INDEX IF NOT EXISTS "submission_rubric_scores_submission_id_idx" ON "public"."submission_rubric_scores"("submission_id");
CREATE INDEX IF NOT EXISTS "submission_rubric_scores_rubric_item_id_idx" ON "public"."submission_rubric_scores"("rubric_item_id");
CREATE INDEX IF NOT EXISTS "assignments_grading_category_id_idx" ON "public"."assignments"("grading_category_id");
CREATE INDEX IF NOT EXISTS "assignments_rubric_id_idx" ON "public"."assignments"("rubric_id");

-- Enable RLS
ALTER TABLE "public"."grading_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rubrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rubric_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."submission_rubric_scores" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grading_categories
CREATE POLICY "Teachers can manage grading categories for their classes" ON "public"."grading_categories"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = grading_categories.class_id AND c.owner_id = auth.uid()
        )
    );

-- RLS Policies for rubrics
CREATE POLICY "Teachers can manage rubrics for their classes" ON "public"."rubrics"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = rubrics.class_id AND c.owner_id = auth.uid()
        )
    );

-- RLS Policies for rubric_items
CREATE POLICY "Teachers can manage rubric items for their rubrics" ON "public"."rubric_items"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rubrics r
            JOIN classes c ON r.class_id = c.id
            WHERE r.id = rubric_items.rubric_id AND c.owner_id = auth.uid()
        )
    );

-- RLS Policies for submission_rubric_scores
CREATE POLICY "Teachers can view and manage rubric scores for their submissions" ON "public"."submission_rubric_scores"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM submissions s
            JOIN assignments a ON s.assignment_id = a.id
            JOIN classes c ON a.class_id = c.id
            WHERE s.id = submission_rubric_scores.submission_id AND c.owner_id = auth.uid()
        )
    );

-- Function to calculate total points for a rubric
CREATE OR REPLACE FUNCTION calculate_rubric_total_points(rubric_uuid uuid)
RETURNS numeric AS $$
DECLARE
    total numeric := 0;
BEGIN
    SELECT COALESCE(SUM(max_score * weight), 0) INTO total
    FROM rubric_items
    WHERE rubric_id = rubric_uuid;
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Function to update rubric total_points
CREATE OR REPLACE FUNCTION update_rubric_total_points()
RETURNS trigger AS $$
BEGIN
    UPDATE rubrics
    SET total_points = calculate_rubric_total_points(NEW.rubric_id)
    WHERE id = NEW.rubric_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update rubric total_points when items change
CREATE TRIGGER update_rubric_total_points_trigger
    AFTER INSERT OR UPDATE OR DELETE ON rubric_items
    FOR EACH ROW EXECUTE FUNCTION update_rubric_total_points();

-- Function to calculate submission rubric score
CREATE OR REPLACE FUNCTION calculate_submission_rubric_score(submission_uuid uuid)
RETURNS numeric AS $$
DECLARE
    total_score numeric := 0;
BEGIN
    SELECT COALESCE(SUM(srs.score * ri.weight), 0) INTO total_score
    FROM submission_rubric_scores srs
    JOIN rubric_items ri ON srs.rubric_item_id = ri.id
    WHERE srs.submission_id = submission_uuid;
    RETURN total_score;
END;
$$ LANGUAGE plpgsql;