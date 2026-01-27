import { NextResponse } from 'next/server'

// Simple background worker for processing AI grading queue
// This can be called by a cron job or manual trigger

export async function POST() {
  try {
    // Call the grading process endpoint multiple times to process all pending jobs
    const results = [];
    let processedCount = 0;
    const maxJobs = 10; // Process up to 10 jobs per call

    for (let i = 0; i < maxJobs; i++) {
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/grading/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.status === 200) {
          const result = await response.json();
          results.push(result);
          processedCount++;

          // If no more jobs, break
          if (result.message === 'No pending grading jobs') {
            break;
          }
        } else {
          console.error(`Grading job ${i + 1} failed:`, response.status);
          break; // Stop if there's an error
        }
      } catch (error) {
        console.error(`Error processing grading job ${i + 1}:`, error);
        break;
      }
    }

    return NextResponse.json({
      message: `Processed ${processedCount} grading jobs`,
      results,
      success: true
    });

  } catch (error) {
    console.error('Grading queue processing error:', error);
    return NextResponse.json({
      error: 'Failed to process grading queue',
      success: false
    }, { status: 500 });
  }
}

// GET endpoint to check queue status
export async function GET() {
  try {
    // This would query the ai_grading_queue table to show status
    // For now, just return a basic response
    return NextResponse.json({
      message: 'Grading queue status endpoint',
      note: 'Use POST to process pending grading jobs'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 });
  }
}