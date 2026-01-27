-- Performance Fix: Join Code Generation Optimization
-- Create sequence for instant unique codes

CREATE SEQUENCE IF NOT EXISTS join_code_seq START 100000;

-- Create function to generate join codes instantly
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
    seq_val INTEGER;
    random_part TEXT;
    join_code TEXT;
BEGIN
    -- Get next sequence value
    SELECT nextval('join_code_seq') INTO seq_val;

    -- Generate random 2-character suffix for extra uniqueness
    SELECT UPPER(SUBSTRING(MD5(random()::text), 1, 2)) INTO random_part;

    -- Combine: 6-digit sequence + 2 random chars = 8 char total
    join_code := LPAD(seq_val::text, 6, '0') || random_part;

    RETURN join_code;
END;
$$ LANGUAGE plpgsql;