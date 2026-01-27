# Learnbeat-Style Learning Content System for Cautie

## Overview
Implement a structured learning content management system similar to Learnbeat, integrated with existing Cautie features.

## Core Features

### 1. Chapter-Based Organization
- **Classes contain Chapters** (hoofdstukken)
- **Chapters contain Sections** with rich content blocks
- **Hierarchical navigation** for structured learning paths

### 2. Rich Content Creation
- **Text blocks** with rich formatting
- **Image/photo integration**
- **Drawing/sketch capabilities**
- **Code snippets and embeds**
- **Multimedia content support**

### 3. Embedded Assignments & Questions
- **Inline assignments** within chapter content
- **Various question types** (multiple choice, text, etc.)
- **Automatic grading** where applicable
- **Progress tracking** per chapter/section

### 4. Agenda Integration
- **Chapter-based assignments** appear in agenda
- **Due dates** linked to learning progression
- **Study session planning** around chapter content
- **Progress milestones** and deadlines

## Technical Architecture

### Database Schema Extensions

#### class_chapters table
```sql
CREATE TABLE class_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- RLS Policies
CREATE POLICY "Teachers can manage chapters in their classes"
ON class_chapters FOR ALL USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = class_chapters.class_id
    AND classes.user_id = auth.uid()
  )
);

CREATE POLICY "Students can view chapters in their classes"
ON class_chapters FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM classes c
    JOIN class_members cm ON cm.class_id = c.id
    WHERE c.id = class_chapters.class_id
    AND cm.user_id = auth.uid()
  )
);
```

#### Enhanced blocks table
```sql
-- Add chapter_id to existing blocks table
ALTER TABLE blocks ADD COLUMN chapter_id uuid REFERENCES class_chapters(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_blocks_chapter ON blocks(chapter_id);
```

#### Enhanced assignments table
```sql
-- Add chapter and block references
ALTER TABLE assignments ADD COLUMN chapter_id uuid REFERENCES class_chapters(id) ON DELETE SET NULL;
ALTER TABLE assignments ADD COLUMN block_id uuid REFERENCES blocks(id) ON DELETE SET NULL;

-- Add content_position for inline assignments
ALTER TABLE assignments ADD COLUMN content_position jsonb; -- {start: number, end: number}
```

### API Endpoints

#### Chapter Management
- `GET /api/classes/[classId]/chapters` - List chapters
- `POST /api/classes/[classId]/chapters` - Create chapter
- `PUT /api/classes/[classId]/chapters/[chapterId]` - Update chapter
- `DELETE /api/classes/[classId]/chapters/[chapterId]` - Delete chapter

#### Chapter Content
- `GET /api/classes/[classId]/chapters/[chapterId]/blocks` - Get chapter blocks
- `POST /api/classes/[classId]/chapters/[chapterId]/blocks` - Add block to chapter
- `PUT /api/classes/[classId]/chapters/[chapterId]/blocks/[blockId]` - Update block
- `DELETE /api/classes/[classId]/chapters/[chapterId]/blocks/[blockId]` - Remove block

### UI Components

#### ChapterNavigation
- Sidebar showing chapter hierarchy
- Progress indicators for completion
- Quick navigation between sections

#### ChapterContentViewer
- Rich content display using existing BlockRenderer
- Embedded assignments shown inline
- Progress tracking and completion status

#### ChapterEditor
- Teacher interface for creating/editing chapters
- Drag-and-drop content organization
- Assignment embedding tools

### Integration Points

#### With Existing Assignment System
- Chapter-based assignments extend existing assignment functionality
- Same grading and submission workflows
- Enhanced with content positioning

#### With Agenda System
- Chapter assignments appear in calendar
- Study planning considers chapter structure
- Progress tracking integrates with learning goals

#### With Block System
- Reuses existing BlockEditor and BlockRenderer
- Extended with chapter-specific features
- Maintains compatibility with standalone materials

## Implementation Phases

### Phase 1: Core Infrastructure
- Database schema creation
- Basic CRUD APIs for chapters
- Chapter navigation component
- Integration with class page

### Phase 2: Content Management
- Chapter editor interface
- Block integration for chapters
- Rich content creation tools

### Phase 3: Assignment Integration
- Embedded assignment system
- Content positioning
- Progress tracking

### Phase 4: Advanced Features
- Drawing/sketch capabilities
- Multimedia content
- Advanced navigation features

### Phase 5: Polish & Testing
- UI/UX refinements
- Performance optimization
- Comprehensive testing

## User Workflows

### Teacher Workflow
1. Create class → Add chapters → Create content sections → Embed assignments
2. Set due dates and learning objectives
3. Monitor student progress through chapters

### Student Workflow
1. Access class → Browse chapters → Read content → Complete embedded assignments
2. Track progress through chapter completion
3. Receive feedback and grades inline

## Benefits

- **Structured Learning**: Clear learning paths with chapters and sections
- **Rich Content**: Support for various media types and interactive elements
- **Integrated Assessment**: Assignments embedded within learning content
- **Progress Tracking**: Clear visibility into learning progression
- **Flexible Teaching**: Teachers can create comprehensive course materials

## Migration Strategy

- Existing classes and materials remain unchanged
- New "Chapters" tab added to class pages
- Gradual adoption - teachers can choose to use structured content or continue with existing materials
- Backward compatibility maintained