// Block types for the hierarchical learning platform

export type BlockType =
  | 'text'
  | 'code'
  | 'image'
  | 'video'
  | 'multiple_choice'
  | 'open_question'
  | 'fill_in_blank'
  | 'drag_drop'
  | 'ordering'
  | 'media_embed'
  | 'media'
  | 'divider'
  | 'list'
  | 'quote'
  | 'layout'
  | 'complex'
  | 'rich_text'
  | 'executable_code'
  | 'paragraph';

export interface BaseBlock {
  id: string;
  type: BlockType;
  content: any; // JSON content specific to each block type
  order_index: number;
  created_at: string;
  updated_at: string;
}

// 1. TextBlock
export interface TextBlockContent {
  content: string;
  style: 'normal' | 'heading' | 'subheading' | 'quote' | 'note' | 'warning';
}

// 2. ImageBlock
export interface ImageBlockContent {
  url: string;
  caption: string;
  transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
}

// 3. VideoBlock
export interface VideoBlockContent {
  url: string;
  provider: 'youtube' | 'vimeo' | 'upload';
  start_seconds: number;
  end_seconds: number | null;
}

// 4. MultipleChoiceBlock
export interface MultipleChoiceContent {
  question: string;
  options: Array<{
    id: string;
    text: string;
    correct: boolean;
  }>;
  multiple_correct: boolean;
  shuffle: boolean;
}

// 5. OpenQuestionBlock (AI grading enabled)
export interface OpenQuestionContent {
  question: string;
  ai_grading: boolean;
  grading_criteria: string;
  max_score: number;
}

// 6. FillInBlankBlock
export interface FillInBlankContent {
  text: string; // e.g., "Ik ___ naar school."
  answers: string[]; // e.g., ["ga", "loop"]
  case_sensitive: boolean;
}

// 7. DragDropBlock
export interface DragDropContent {
  prompt: string;
  pairs: Array<{
    left: string;
    right: string;
  }>;
}

// 8. OrderingBlock
export interface OrderingContent {
  prompt: string;
  items: string[];
  correct_order: number[];
}

// 9. MediaEmbedBlock
export interface MediaEmbedContent {
  embed_url: string;
  description: string;
}

// 10. DividerBlock
export interface DividerContent {
  style: 'line' | 'space' | 'page_break';
}

// 11. CodeBlock
export interface CodeBlockContent {
  language: string;
  code: string;
  showLineNumbers?: boolean;
}

// 12. ListBlock
export interface ListItem {
  id: string;
  text: string;
  checked?: boolean;
}

export interface ListBlockContent {
  type: 'bulleted' | 'numbered';
  items: ListItem[];
}

// 13. QuoteBlock
export interface QuoteBlockContent {
  text: string;
  author?: string;
}

// 14. LayoutBlock
export interface LayoutBlockContent {
  type: 'divider' | 'spacer' | 'columns';
  columns?: number;
}

// 15. ComplexBlock (for advanced content like mindmaps)
export interface ComplexBlockContent {
  type: 'mindmap' | 'timeline' | 'diagram' | 'other';
  data: any; // JSON data for the complex content
  viewerType?: string;
}

// 16. ParagraphBlockContent
export interface ParagraphBlockContent {
  type: 'paragraph';
  text: string;
}

// 17. ImageSimpleBlockContent
export interface ImageSimpleBlockContent {
  type: 'image';
  url: string;
  alt: string;
}

// 16. RichTextBlock (AI-powered rich text editor)
export interface RichTextBlockContent {
  html: string;
  plainText: string;
  aiSuggestions?: Array<{
    id: string;
    type: 'grammar' | 'style' | 'content';
    suggestion: string;
    applied: boolean;
  }>;
}

// 17. ExecutableCodeBlock (code execution environment)
export interface ExecutableCodeBlockContent {
  language: string;
  code: string;
  output?: string;
  error?: string;
  executionTime?: number;
  canExecute: boolean;
}

// Union type for all block contents
export type BlockContent =
  | TextBlockContent
  | CodeBlockContent
  | ImageBlockContent
  | VideoBlockContent
  | MultipleChoiceContent
  | OpenQuestionContent
  | FillInBlankContent
  | DragDropContent
  | OrderingContent
  | MediaEmbedContent
  | DividerContent
  | ListBlockContent
  | QuoteBlockContent
  | LayoutBlockContent
  | ComplexBlockContent
  | RichTextBlockContent
  | ExecutableCodeBlockContent
  | ParagraphBlockContent
  | ImageSimpleBlockContent;

// Props for block components
export interface BlockProps {
  block: BaseBlock;
  onUpdate?: (content: BlockContent) => void;
  onDelete?: () => void;
  isEditing?: boolean;
  className?: string;
}