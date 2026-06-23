ALTER TABLE ideas ADD COLUMN is_in_poll BOOLEAN DEFAULT false;
CREATE INDEX idx_ideas_is_in_poll ON ideas(is_in_poll);
