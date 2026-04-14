import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, scope, blockData, pageData, assignmentData, blockType } = await request.json();

    let contentToModify = '';
    let context = '';

    if (scope === 'block') {
      contentToModify = extractBlockContent(blockData, blockType);
      context = `Modifying a single ${blockType} block`;
    } else if (scope === 'page') {
      contentToModify = pageData?.map((block: any) => extractBlockContent(block.data, block.type)).join('\n\n') || '';
      context = `Modifying an entire page with ${pageData?.length || 0} blocks`;
    } else if (scope === 'assignment') {
      contentToModify = assignmentData?.blocks?.map((block: any) => extractBlockContent(block.data, block.type)).join('\n\n') || '';
      context = `Modifying an entire assignment with ${assignmentData?.blocks?.length || 0} blocks`;
    }

    // Call the unified AI flow
    const aiResponse = await fetch(`${process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/ai/handle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flowName: 'modifyContent',
        input: { prompt, scope, blockData, pageData, assignmentData, blockType }
      })
    });

    if (!aiResponse.ok) {
      // If AI service unavailable, attempt a simple text transformation
      const fallbackResult = applySimpleTransform(prompt, scope, blockData, pageData, assignmentData, blockType);
      return NextResponse.json({
        success: true,
        ...fallbackResult,
        originalScope: scope,
      });
    }

    const aiResult = await aiResponse.json();

    if (scope === 'block') {
      const modifiedData = parseBlockResponse(aiResult.modifiedData || aiResult, blockType, blockData);
      return NextResponse.json({ success: true, modifiedData, originalScope: scope });
    } else if (scope === 'page') {
      // Parse multi-block response - AI returns modified versions of each block
      const modifiedBlocks = parseMultiBlockResponse(aiResult, pageData);
      return NextResponse.json({ success: true, modifiedBlocks, originalScope: scope });
    } else {
      // Assignment scope
      const modifiedBlocks = parseMultiBlockResponse(aiResult, assignmentData?.blocks || []);
      return NextResponse.json({ success: true, modifiedBlocks, originalScope: scope });
    }

  } catch (error) {
    console.error('AI modification error:', error);
    return NextResponse.json(
      { error: 'Failed to modify content with AI' },
      { status: 500 }
    );
  }
}

function extractBlockContent(data: any, type: string): string {
  switch (type) {
    case 'text':
      return data?.content || '';
    case 'multiple_choice':
      return `Question: ${data?.question}\nOptions: ${data?.options?.map((opt: any) => opt.text).join(', ')}`;
    case 'open_question':
      return `Question: ${data?.question}\nCriteria: ${data?.grading_criteria}`;
    case 'fill_in_blank':
      return `Text: ${data?.text}\nAnswers: ${data?.answers?.join(', ')}`;
    case 'drag_drop':
    case 'matching':
      return `Prompt: ${data?.prompt}\nPairs: ${data?.pairs?.map((pair: any) => `${pair.left} → ${pair.right}`).join(', ')}`;
    case 'ordering':
      return `Prompt: ${data?.prompt}\nItems: ${data?.items?.join(', ')}`;
    default:
      return JSON.stringify(data);
  }
}

function parseBlockResponse(modifiedData: any, blockType: string, originalData: any): any {
  if (typeof modifiedData === 'string') {
    const cleaned = modifiedData.trim();
    switch (blockType) {
      case 'text':
        return { ...originalData, content: cleaned };
      case 'multiple_choice': {
        const lines = cleaned.split('\n');
        const question = lines.find(line => line.startsWith('Question:'))?.replace('Question:', '').trim() || originalData.question;
        const optionsText = lines.find(line => line.startsWith('Options:'))?.replace('Options:', '').trim();
        const options = optionsText ? optionsText.split(',').map((text: string, index: number) => ({
          id: String.fromCharCode(97 + index),
          text: text.trim(),
          correct: index === 0
        })) : originalData.options;
        return { ...originalData, question, options };
      }
      case 'open_question': {
        const questionMatch = cleaned.match(/Question:\s*(.+?)(?:\n|$)/i);
        const criteriaMatch = cleaned.match(/Criteria:\s*(.+?)(?:\n|$)/i);
        return {
          ...originalData,
          question: questionMatch ? questionMatch[1].trim() : originalData.question,
          grading_criteria: criteriaMatch ? criteriaMatch[1].trim() : originalData.grading_criteria,
        };
      }
      case 'fill_in_blank': {
        const textMatch = cleaned.match(/Text:\s*(.+?)(?:\n|$)/i);
        const answersMatch = cleaned.match(/Answers:\s*(.+?)(?:\n|$)/i);
        return {
          ...originalData,
          text: textMatch ? textMatch[1].trim() : originalData.text,
          answers: answersMatch ? answersMatch[1].split(',').map((a: string) => a.trim()) : originalData.answers,
        };
      }
      case 'drag_drop':
      case 'matching': {
        const promptMatch = cleaned.match(/Prompt:\s*(.+?)(?:\n|$)/i);
        const pairsMatch = cleaned.match(/Pairs:\s*(.+?)(?:\n|$)/i);
        const pairs = pairsMatch
          ? pairsMatch[1]
              .split(',')
              .map((pair: string) => pair.trim())
              .filter(Boolean)
              .map((pair: string) => {
                const [left, right] = pair.split('â†’').map((side) => side?.trim() || '');
                return { left, right };
              })
              .filter((pair: { left: string; right: string }) => pair.left && pair.right)
          : originalData.pairs;
        return {
          ...originalData,
          prompt: promptMatch ? promptMatch[1].trim() : originalData.prompt,
          pairs,
        };
      }
      default:
        return { ...originalData, content: cleaned };
    }
  }
  return { ...originalData, ...modifiedData };
}

function parseMultiBlockResponse(aiResult: any, originalBlocks: any[]): any[] {
  // If AI returned an array of modified blocks, match them to originals
  const modifiedData = aiResult?.modifiedBlocks || aiResult?.modifiedData;

  if (Array.isArray(modifiedData) && modifiedData.length === originalBlocks.length) {
    return originalBlocks.map((block: any, idx: number) => ({
      ...block,
      data: parseBlockResponse(modifiedData[idx], block.type, block.data),
    }));
  }

  // If AI returned a single string, apply it to all text blocks
  if (typeof modifiedData === 'string' || typeof aiResult === 'string') {
    const text = typeof modifiedData === 'string' ? modifiedData : aiResult;
    const sections = text.split('\n\n');
    let sectionIdx = 0;
    return originalBlocks.map((block: any) => {
      if (block.type === 'text' && sectionIdx < sections.length) {
        const modified = { ...block, data: { ...block.data, content: sections[sectionIdx].trim() } };
        sectionIdx++;
        return modified;
      }
      return block;
    });
  }

  // Fallback: return originals unmodified
  return originalBlocks;
}

function applySimpleTransform(prompt: string, scope: string, blockData: any, pageData: any[], assignmentData: any, blockType: string): any {
  const lowerPrompt = prompt.toLowerCase();

  if (scope === 'block') {
    const content = extractBlockContent(blockData, blockType);
    let modified = content;

    if (lowerPrompt.includes('shorter') || lowerPrompt.includes('summarize') || lowerPrompt.includes('shorten')) {
      // Simple truncation as fallback
      const sentences = content.split(/[.!?]+/).filter(Boolean);
      modified = sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 2))).join('. ') + '.';
    }

    return { modifiedData: parseBlockResponse(modified, blockType, blockData) };
  }

  // For page/assignment scope, return blocks as-is (AI unavailable)
  const blocks = scope === 'page' ? pageData : assignmentData?.blocks || [];
  return { modifiedBlocks: blocks };
}
