import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

interface TrendResponse {
  currentAvg: number | null;
  previousAvg: number | null;
  trend: number; // positive = improvement, negative = decline, 0 = flat
}

function getPeriodDates(
  period: 'term' | 'month' | 'all'
): { current: [Date, Date]; previous: [Date, Date] } {
  const now = new Date();

  switch (period) {
    case 'term': {
      // 6-month windows
      const currentStart = new Date(now);
      currentStart.setMonth(currentStart.getMonth() - 6);
      const currentEnd = new Date(now);

      const previousStart = new Date(currentStart);
      previousStart.setMonth(previousStart.getMonth() - 6);
      const previousEnd = new Date(currentStart);

      return {
        current: [currentStart, currentEnd],
        previous: [previousStart, previousEnd],
      };
    }
    case 'month': {
      // Calendar months
      const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const previousStart = new Date(
        currentStart.getFullYear(),
        currentStart.getMonth() - 1,
        1
      );
      const previousEnd = new Date(
        currentStart.getFullYear(),
        currentStart.getMonth(),
        0
      );

      return {
        current: [currentStart, currentEnd],
        previous: [previousStart, previousEnd],
      };
    }
    case 'all':
    default: {
      // Calendar years
      const currentStart = new Date(now.getFullYear(), 0, 1);
      const currentEnd = new Date(now);

      const previousStart = new Date(now.getFullYear() - 1, 0, 1);
      const previousEnd = new Date(now.getFullYear() - 1, 11, 31);

      return {
        current: [currentStart, currentEnd],
        previous: [previousStart, previousEnd],
      };
    }
  }
}

async function calculateAverageForPeriod(
  supabase: any,
  classId: string,
  startDate: Date,
  endDate: Date
): Promise<number | null> {
  try {
    const { data: grades, error } = await supabase
      .from('student_grades')
      .select('grade')
      .eq('class_id', classId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error || !grades || grades.length === 0) {
      return null;
    }

    const sum = grades.reduce((acc: number, g: any) => acc + (g.grade || 0), 0);
    return Math.round((sum / grades.length) * 10) / 10;
  } catch (error) {
    console.error('Error calculating average:', error);
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get period from query params
    const url = new URL(req.url);
    const period = (url.searchParams.get('period') || 'term') as
      | 'term'
      | 'month'
      | 'all';

    // Verify user has access to this class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, teacher_id')
      .eq('id', params.classId)
      .single();

    if (classError || !classData || classData.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { current, previous } = getPeriodDates(period);

    // Calculate averages for both periods
    const [currentAvg, previousAvg] = await Promise.all([
      calculateAverageForPeriod(supabase, params.classId, current[0], current[1]),
      calculateAverageForPeriod(supabase, params.classId, previous[0], previous[1]),
    ]);

    // Calculate trend
    let trend = 0;
    if (currentAvg !== null && previousAvg !== null) {
      trend = Math.round((currentAvg - previousAvg) * 10) / 10;
    }

    const response: TrendResponse = {
      currentAvg,
      previousAvg,
      trend,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error calculating trend:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
