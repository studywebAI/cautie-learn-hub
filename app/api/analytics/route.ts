import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { startOfWeek, subWeeks, format, differenceInMinutes } from 'date-fns'

export const dynamic = 'force-dynamic'

// Simple in-memory cache (in production, use Redis)
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser();
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guestId');

    if (!user && !guestId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user?.id || guestId;
    const cacheKey = `analytics-${userId}`;

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('Returning cached analytics for user:', userId);
      return NextResponse.json(cached.data);
    }

    if (!userId) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Get study time data for the last 7 days
    const weekStart = startOfWeek(new Date());
    const lastWeekStart = subWeeks(weekStart, 1);

    const { data: sessionLogs, error: sessionError } = await supabase
      .from('session_logs')
      .select('*')
      .eq('student_id', userId)
      .gte('started_at', lastWeekStart.toISOString())
      .order('started_at', { ascending: false });

    if (sessionError) {
      console.error('Session logs error:', sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    // Calculate weekly study time
    const studyTimeData: { [key: string]: number } = {};
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Initialize with 0 for each day
    daysOfWeek.forEach(day => {
      studyTimeData[day] = 0;
    });

    // Calculate study time for each session
    sessionLogs?.forEach(log => {
      if (log.started_at && log.finished_at) {
        const startDate = new Date(log.started_at);
        const endDate = new Date(log.finished_at);
        const durationMinutes = differenceInMinutes(endDate, startDate);

        if (durationMinutes > 0) {
          const dayKey = format(startDate, 'EEE');
          if (studyTimeData[dayKey] !== undefined) {
            studyTimeData[dayKey] += durationMinutes;
          }
        }
      }
    });

    // Convert to chart format
    const weeklyStudyTime = daysOfWeek.map(day => ({
      day,
      'Study Time': studyTimeData[day]
    }));

    // Get total study time
    const totalStudyTime = Object.values(studyTimeData).reduce((sum, time) => sum + time, 0);

    // Get progress data
    const { data: progressSnapshots, error: progressError } = await supabase
      .from('progress_snapshots')
      .select('completion_percent, paragraphs!inner(chapter_id)')
      .eq('student_id', userId);

    if (progressError) {
      console.error('Progress error:', progressError);
    }

    // Calculate average progress across all paragraphs
    const avgProgress = progressSnapshots && progressSnapshots.length > 0
      ? Math.round(progressSnapshots.reduce((sum, snap) => sum + snap.completion_percent, 0) / progressSnapshots.length)
      : 0;

    // Get assignment completion data
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select(`
        id,
        assignments!inner(
          title,
          due_date
        )
      `)
      .eq('user_id', userId);

    if (submissionsError) {
      console.error('Submissions error:', submissionsError);
    }

    const completedAssignments = submissions?.length || 0;

    // Simplified total assignments (same as completed for now)
    const totalAssignments = completedAssignments;

    const assignmentCompletionRate = totalAssignments > 0
      ? Math.round((completedAssignments / totalAssignments) * 100)
      : 0;

    // Get quiz performance
    const { data: quizAnswers, error: quizError } = await supabase
      .from('student_answers')
      .select('is_correct, score')
      .eq('student_id', userId)
      .not('is_correct', 'is', null);

    let quizPerformance = {
      totalQuestions: 0,
      correctAnswers: 0,
      averageScore: 0
    };

    if (quizAnswers && !quizError) {
      quizPerformance.totalQuestions = quizAnswers.length;
      quizPerformance.correctAnswers = quizAnswers.filter(a => a.is_correct).length;
      quizPerformance.averageScore = quizAnswers.length > 0
        ? Math.round(quizAnswers.reduce((sum, a) => sum + (a.score || 0), 0) / quizAnswers.length)
        : 0;
    }

    // Generate recommendations based on data
    const recommendations: string[] = [];

    if (avgProgress < 50) {
      recommendations.push("Focus on completing more material to improve your overall progress.");
    }

    if (totalStudyTime < 300) { // Less than 5 hours/week
      recommendations.push("Increase your study time to at least 5 hours per week for better retention.");
    }

    if (assignmentCompletionRate < 70) {
      recommendations.push("Complete more assignments to improve your understanding and grades.");
    }

    if (quizPerformance.averageScore < 70 && quizPerformance.totalQuestions > 0) {
      recommendations.push("Review quiz questions you got wrong and focus on those topics.");
    }

    if (recommendations.length === 0) {
      recommendations.push("Great job! Keep up your current study habits.");
      recommendations.push("Consider challenging yourself with more advanced materials.");
    }

    const analytics = {
      weeklyStudyTime,
      totalStudyTime,
      avgProgress,
      assignmentCompletionRate,
      completedAssignments,
      totalAssignments,
      quizPerformance,
      recommendations,
      lastUpdated: new Date().toISOString()
    };

    // Cache the result
    cache.set(cacheKey, { data: analytics, timestamp: Date.now() });

    return NextResponse.json(analytics);
  } catch (err) {
    console.error('Unexpected error in analytics GET:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}