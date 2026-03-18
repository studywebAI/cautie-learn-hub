import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string }> }
) {
  try {
    const { subjectId, chapterId, paragraphId } = await params;

    const [paragraphResponse, paragraphsResponse, assignmentsResponse] = await Promise.all([
      fetch(
        new URL(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}`, request.url),
        {
          headers: { cookie: request.headers.get('cookie') || '' },
          cache: 'no-store',
        }
      ),
      fetch(new URL(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs`, request.url), {
        headers: { cookie: request.headers.get('cookie') || '' },
        cache: 'no-store',
      }),
      fetch(
        new URL(
          `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments`,
          request.url
        ),
        {
          headers: { cookie: request.headers.get('cookie') || '' },
          cache: 'no-store',
        }
      ),
    ]);

    if (!paragraphResponse.ok) {
      return NextResponse.json({ error: 'Paragraph not found' }, { status: paragraphResponse.status });
    }
    if (!paragraphsResponse.ok) {
      return NextResponse.json({ error: 'Failed to load paragraph list' }, { status: paragraphsResponse.status });
    }
    if (!assignmentsResponse.ok) {
      return NextResponse.json({ error: 'Failed to load assignments' }, { status: assignmentsResponse.status });
    }

    const [paragraph, allParagraphs, assignments] = await Promise.all([
      paragraphResponse.json(),
      paragraphsResponse.json(),
      assignmentsResponse.json(),
    ]);

    return NextResponse.json({
      paragraph,
      allParagraphs: Array.isArray(allParagraphs) ? allParagraphs : [],
      assignments: Array.isArray(assignments) ? assignments : [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
