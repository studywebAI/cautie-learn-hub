DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS ideas CASCADE;

CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_ideas_created_by ON ideas(created_by);
CREATE INDEX idx_ideas_status ON ideas(status);
CREATE INDEX idx_ideas_status_created_at ON ideas(status, created_at DESC);

CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(idea_id, user_id)
);

CREATE INDEX idx_votes_idea_id ON votes(idea_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ideas_select" ON ideas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "ideas_insert" ON ideas FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());
CREATE POLICY "ideas_update" ON ideas FOR UPDATE USING (auth.role() = 'authenticated' AND created_by = auth.uid()) WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());
CREATE POLICY "ideas_delete" ON ideas FOR DELETE USING (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "votes_select" ON votes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "votes_insert" ON votes FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());
CREATE POLICY "votes_delete" ON votes FOR DELETE USING (auth.role() = 'authenticated' AND user_id = auth.uid());
