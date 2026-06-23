-- ============================================================================
-- SUPABASE POSTGRESQL SCHEMA: IDEAS BOARD FEATURE
-- Production-ready with RLS, indexes, and comprehensive comments
-- ============================================================================

DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS ideas CASCADE;

-- ============================================================================
-- IDEAS TABLE
-- ============================================================================

CREATE TABLE ideas (
  -- Primary key: UUID for distributed systems compatibility
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core content fields
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Status tracking: active (visible), pending (waiting review), completed (implemented)
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'completed')),

  -- Audit fields: timestamps and creator reference
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,

  -- Foreign key reference to Supabase auth.users table
  CONSTRAINT fk_ideas_created_by
    FOREIGN KEY (created_by)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add comments for schema documentation
COMMENT ON TABLE ideas IS 'Stores user-submitted ideas for the Ideas Board feature';
COMMENT ON COLUMN ideas.id IS 'Unique identifier (UUID) for each idea';
COMMENT ON COLUMN ideas.title IS 'Idea title (max 255 characters)';
COMMENT ON COLUMN ideas.description IS 'Detailed description of the idea';
COMMENT ON COLUMN ideas.status IS 'Current status: active, pending, or completed';
COMMENT ON COLUMN ideas.created_at IS 'Timestamp when idea was created (UTC)';
COMMENT ON COLUMN ideas.updated_at IS 'Timestamp when idea was last updated (UTC)';
COMMENT ON COLUMN ideas.created_by IS 'User ID of the idea creator (references auth.users)';

-- ============================================================================
-- INDEXES FOR IDEAS TABLE
-- ============================================================================

-- Index by creator for quick user-specific queries
CREATE INDEX idx_ideas_created_by ON ideas(created_by);

-- Index by status for filtering (e.g., showing only active ideas)
CREATE INDEX idx_ideas_status ON ideas(status);

-- Composite index for common queries: active ideas sorted by creation
CREATE INDEX idx_ideas_status_created_at ON ideas(status, created_at DESC);

-- Index on created_at for timeline-based queries
CREATE INDEX idx_ideas_created_at ON ideas(created_at DESC);

-- ============================================================================
-- VOTES TABLE
-- ============================================================================

CREATE TABLE votes (
  -- Primary key: UUID for consistency
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key references
  idea_id UUID NOT NULL,
  user_id UUID NOT NULL,

  -- Audit field
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Foreign key constraints
  CONSTRAINT fk_votes_idea_id
    FOREIGN KEY (idea_id)
    REFERENCES ideas(id) ON DELETE CASCADE,

  CONSTRAINT fk_votes_user_id
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Unique constraint: each user can vote once per idea
  CONSTRAINT unique_vote_per_user_per_idea
    UNIQUE(idea_id, user_id)
);

-- Add comments for schema documentation
COMMENT ON TABLE votes IS 'Stores votes/upvotes on ideas from authenticated users';
COMMENT ON COLUMN votes.id IS 'Unique identifier (UUID) for each vote record';
COMMENT ON COLUMN votes.idea_id IS 'Reference to the idea being voted on';
COMMENT ON COLUMN votes.user_id IS 'Reference to the user who cast the vote';
COMMENT ON COLUMN votes.created_at IS 'Timestamp when vote was cast (UTC)';

-- ============================================================================
-- INDEXES FOR VOTES TABLE
-- ============================================================================

-- Index by idea_id for quick vote counting and retrieval
CREATE INDEX idx_votes_idea_id ON votes(idea_id);

-- Index by user_id for querying user's own votes
CREATE INDEX idx_votes_user_id ON votes(user_id);

-- Composite index for the UNIQUE constraint (already creates an index, but explicit for clarity)
CREATE INDEX idx_votes_idea_user ON votes(idea_id, user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- IDEAS TABLE POLICIES
-- ============================================================================

-- Policy: All authenticated users can view all ideas
CREATE POLICY "Users can view all ideas" ON ideas
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can create ideas
CREATE POLICY "Users can create ideas" ON ideas
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

-- Policy: Users can update only their own ideas
CREATE POLICY "Users can update own ideas" ON ideas
  FOR UPDATE
  USING (auth.role() = 'authenticated' AND created_by = auth.uid())
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

-- Policy: Users can delete only their own ideas
CREATE POLICY "Users can delete own ideas" ON ideas
  FOR DELETE
  USING (auth.role() = 'authenticated' AND created_by = auth.uid());

-- ============================================================================
-- VOTES TABLE POLICIES
-- ============================================================================

-- Policy: All authenticated users can view all votes
CREATE POLICY "Users can view all votes" ON votes
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can create votes (for any idea)
CREATE POLICY "Users can create own votes" ON votes
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Policy: Users can delete only their own votes
CREATE POLICY "Users can delete own votes" ON votes
  FOR DELETE
  USING (auth.role() = 'authenticated' AND user_id = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get vote count for an idea
CREATE OR REPLACE FUNCTION get_idea_vote_count(idea_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM votes WHERE votes.idea_id = get_idea_vote_count.idea_id;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_idea_vote_count IS 'Returns the total number of votes for a given idea';

-- Function to check if user has voted on an idea
CREATE OR REPLACE FUNCTION has_user_voted(idea_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM votes
    WHERE votes.idea_id = has_user_voted.idea_id
      AND votes.user_id = has_user_voted.user_id
  );
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION has_user_voted IS 'Returns true if the given user has voted on the given idea';

-- ============================================================================
-- TRIGGERS FOR AUDIT TIMESTAMPS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ideas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update the updated_at column
CREATE TRIGGER trigger_ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_ideas_updated_at();

COMMENT ON TRIGGER trigger_ideas_updated_at ON ideas IS 'Automatically updates the updated_at timestamp when an idea is modified';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
-- Ready for production deployment to Supabase
-- All tables have RLS enabled and appropriate policies configured
-- Indexes are optimized for common query patterns
-- Foreign keys ensure referential integrity with auth.users
