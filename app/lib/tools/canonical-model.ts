export type CanonicalNodeType = 'concept' | 'event' | 'task' | 'fact' | 'question' | 'section';

export type CanonicalRelationType =
  | 'contains'
  | 'causes'
  | 'depends_on'
  | 'part_of'
  | 'example_of'
  | 'next'
  | 'references';

export type CanonicalDatePrecision = 'day' | 'month' | 'year' | 'unknown';

export type CanonicalSourceRef = {
  id: string;
  kind: 'text' | 'url' | 'file' | 'image';
  label?: string | null;
  uri?: string | null;
};

export type CanonicalTemporal = {
  nodeId: string;
  startAt?: string | null;
  endAt?: string | null;
  precision: CanonicalDatePrecision;
};

export type CanonicalNode = {
  id: string;
  type: CanonicalNodeType;
  title: string;
  body?: string | null;
  tags?: string[];
  sourceRefs?: CanonicalSourceRef[];
};

export type CanonicalEdge = {
  id: string;
  from: string;
  to: string;
  relation: CanonicalRelationType;
  label?: string | null;
};

export type CanonicalLayoutView = 'notes' | 'wordweb' | 'timeline';

export type CanonicalLayoutState = {
  view: CanonicalLayoutView;
  zoom?: number;
  collapsedNodeIds?: string[];
  nodePositions?: Record<string, { x: number; y: number }>;
  laneOrder?: string[];
  filters?: Record<string, string | number | boolean>;
};

export type CanonicalDocument = {
  version: 1;
  title?: string | null;
  nodes: CanonicalNode[];
  edges: CanonicalEdge[];
  temporal: CanonicalTemporal[];
  layouts?: CanonicalLayoutState[];
  metadata?: Record<string, unknown>;
};

