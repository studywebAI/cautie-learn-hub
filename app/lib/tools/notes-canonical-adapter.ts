import type { CanonicalDocument, CanonicalEdge, CanonicalNode } from '@/lib/tools/canonical-model';

export type NoteSection = { title: string; content: string | string[] };

function slugify(input: string) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'section';
}

export function notesSectionsToCanonical(
  sections: NoteSection[],
  options?: { title?: string | null }
): CanonicalDocument {
  const rootId = 'root-notes';
  const rootNode: CanonicalNode = {
    id: rootId,
    type: 'section',
    title: options?.title?.trim() || 'Notes',
  };

  const nodes: CanonicalNode[] = [rootNode];
  const edges: CanonicalEdge[] = [];
  const temporal: CanonicalDocument['temporal'] = [];

  sections.forEach((section, index) => {
    const id = `note-${index + 1}-${slugify(section.title)}`;
    const body = Array.isArray(section.content)
      ? section.content.join('\n')
      : String(section.content || '');
    nodes.push({
      id,
      type: 'section',
      title: String(section.title || `Section ${index + 1}`),
      body,
    });
    const dateMatch = `${section.title}\n${body}`.match(/\b(19|20)\d{2}\b/);
    if (dateMatch) {
      temporal.push({
        nodeId: id,
        startAt: `${dateMatch[0]}-01-01`,
        endAt: `${dateMatch[0]}-12-31`,
        precision: 'year',
      });
    }
    edges.push({
      id: `edge-root-${id}`,
      from: rootId,
      to: id,
      relation: 'contains',
    });
    if (index > 0) {
      const prevId = `note-${index}-${slugify(sections[index - 1].title)}`;
      edges.push({
        id: `edge-seq-${prevId}-${id}`,
        from: prevId,
        to: id,
        relation: 'next',
      });
    }
  });

  return {
    version: 1,
    title: options?.title?.trim() || 'Notes',
    nodes,
    edges,
    temporal,
    metadata: { source: 'notes' },
  };
}

export function canonicalToNotesSections(document: CanonicalDocument): NoteSection[] {
  const nodeMap = new Map(document.nodes.map((node) => [node.id, node]));
  const root = document.nodes.find((node) => node.id === 'root-notes') || document.nodes[0];
  if (!root) return [];

  const containEdges = document.edges.filter(
    (edge) => edge.from === root.id && edge.relation === 'contains'
  );

  const bySequence = document.edges
    .filter((edge) => edge.relation === 'next')
    .reduce<Record<string, string>>((acc, edge) => {
      acc[edge.from] = edge.to;
      return acc;
    }, {});

  const orderedIds: string[] = [];
  if (containEdges.length > 0) {
    const candidates = containEdges.map((edge) => edge.to);
    const pointed = new Set(Object.values(bySequence));
    const head = candidates.find((id) => !pointed.has(id)) || candidates[0];
    if (head) {
      orderedIds.push(head);
      while (bySequence[orderedIds[orderedIds.length - 1]]) {
        orderedIds.push(bySequence[orderedIds[orderedIds.length - 1]]);
      }
      for (const id of candidates) {
        if (!orderedIds.includes(id)) orderedIds.push(id);
      }
    }
  } else {
    for (const node of document.nodes) {
      if (node.id !== root.id) orderedIds.push(node.id);
    }
  }

  return orderedIds
    .map((id) => nodeMap.get(id))
    .filter((node): node is CanonicalNode => Boolean(node))
    .map((node) => ({
      title: node.title || 'Section',
      content: node.body || '',
    }));
}
