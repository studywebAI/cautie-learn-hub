type SourceLike = {
  source_type?: string | null;
  mime_type?: string | null;
  file_name?: string | null;
  external_provider?: string | null;
  external_file_id?: string | null;
  content?: string | null;
  extracted_text?: string | null;
  parsed_metadata?: Record<string, any> | null;
  thumbnail_url?: string | null;
};

function compact(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function buildFileShell(source: SourceLike) {
  const metadata = source.parsed_metadata || {};
  const lines = [
    '[FILE_SHELL]',
    `name: ${compact(String(source.file_name || 'Untitled file'))}`,
    `source_type: ${compact(String(source.source_type || 'file'))}`,
    `mime: ${compact(String(source.mime_type || 'unknown'))}`,
    source.external_provider ? `provider: ${compact(String(source.external_provider))}` : null,
    source.external_file_id ? `external_id: ${compact(String(source.external_file_id))}` : null,
    source.thumbnail_url ? `thumbnail_url: ${compact(String(source.thumbnail_url))}` : null,
    metadata?.webUrl ? `web_url: ${compact(String(metadata.webUrl))}` : null,
    typeof metadata?.containsVisuals === 'boolean' ? `contains_visuals: ${metadata.containsVisuals ? 'true' : 'false'}` : null,
    typeof metadata?.width === 'number' ? `width: ${metadata.width}` : null,
    typeof metadata?.height === 'number' ? `height: ${metadata.height}` : null,
    '[/FILE_SHELL]',
  ].filter(Boolean);
  return lines.join('\n');
}

export function buildSourceCorpus(input: {
  prompt?: string;
  sources: SourceLike[];
}) {
  const chunks: string[] = [];
  if (input.prompt?.trim()) chunks.push(input.prompt.trim());

  for (const source of input.sources) {
    const text = String(source.extracted_text || source.content || '').trim();
    const sourceType = String(source.source_type || 'text');
    const hasVisualShell = sourceType !== 'text' || Boolean(source.thumbnail_url);
    const label = source.file_name ? `[${source.file_name}]` : '[source]';

    if (hasVisualShell) {
      const shell = buildFileShell(source);
      if (text) {
        chunks.push(`${label}\n${shell}\n[EXTRACTED_TEXT]\n${text}\n[/EXTRACTED_TEXT]`);
      } else {
        chunks.push(`${label}\n${shell}`);
      }
      continue;
    }

    if (text) {
      chunks.push(`${label}\n${text}`);
    }
  }

  return chunks.join('\n\n').trim();
}

