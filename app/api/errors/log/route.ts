import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * POST /api/errors/log
 *
 * Centralized error logging endpoint.
 * Stores errors to a local JSON file for team monitoring and analysis.
 *
 * In production, this could integrate with external services like:
 * - Sentry
 * - LogRocket
 * - Datadog
 * - Custom monitoring backend
 */

interface LoggedError {
  code: string;
  message: string;
  stack?: string;
  url?: string;
  timestamp: string;
  userId?: string;
  context?: Record<string, any>;
}

interface ErrorLog {
  errors: LoggedError[];
  lastUpdated: string;
}

const ERROR_LOG_DIR = join(process.cwd(), '.data');
const ERROR_LOG_FILE = join(ERROR_LOG_DIR, 'errors.jsonl');

/**
 * Append error to JSONL log file (one JSON object per line).
 * JSONL format is ideal for streaming and log aggregation.
 */
async function appendErrorLog(error: LoggedError): Promise<void> {
  try {
    // Ensure directory exists
    await mkdir(ERROR_LOG_DIR, { recursive: true });

    // Append error as a new line (JSONL format)
    const line = JSON.stringify(error) + '\n';
    await writeFile(ERROR_LOG_FILE, line, { flag: 'a' });
  } catch (err) {
    console.error('Failed to write to error log:', err);
  }
}

/**
 * Get error statistics for monitoring.
 */
async function getErrorStats(): Promise<{ total: number; byCategoryFive: Record<string, number>; recent: LoggedError[] } | null> {
  try {
    const content = await readFile(ERROR_LOG_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const errors: LoggedError[] = lines.map((line) => JSON.parse(line));

    // Group by error category (first part of code before dash)
    const byCategoryFive: Record<string, number> = {};
    errors.forEach((err) => {
      const category = err.code.split('-')[0] || 'UNKNOWN';
      byCategoryFive[category] = (byCategoryFive[category] || 0) + 1;
    });

    return {
      total: errors.length,
      byCategoryFive,
      recent: errors.slice(-10), // Last 10 errors
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const error = body as LoggedError;

    // Validate required fields
    if (!error.code || !error.message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Append to log file
    await appendErrorLog(error);

    // TODO: In production, also:
    // - Send to external monitoring service (Sentry, Datadog, etc.)
    // - Trigger alerts if error is critical
    // - Notify team via Slack/email if pattern detected
    // - Store in database for long-term analysis

    return NextResponse.json(
      {
        success: true,
        code: error.code,
        message: 'Error logged successfully',
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error in POST /api/errors/log:', err);
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
  }
}

/**
 * GET /api/errors/log/stats
 *
 * Return error statistics for the monitoring dashboard.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const stats = await getErrorStats();
    return NextResponse.json({
      stats,
      message: 'Use this for team monitoring dashboard',
    });
  } catch (err) {
    console.error('Error in GET /api/errors/log/stats:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
