#!/usr/bin/env node

/**
 * Simple script to process AI grading queue
 * Can be run as a cron job or manually
 *
 * Usage:
 * node scripts/process-grading-queue.js
 *
 * Or as a cron job (every 5 minutes):
 * */5 * * * * cd /path/to/your/app && node scripts/process-grading-queue.js
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function processGradingQueue() {
  console.log('🔄 Processing AI grading queue...');

  try {
    const response = await fetch(`${BASE_URL}/api/ai/process-grading-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Processed ${result.results?.length || 0} grading jobs`);
      if (result.results?.length > 0) {
        console.log('📊 Results:', result.results);
      }
    } else {
      console.error('❌ Failed to process grading queue:', response.status);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
  } catch (error) {
    console.error('💥 Error processing grading queue:', error.message);
  }
}

// Run the processing
processGradingQueue().then(() => {
  console.log('🎯 Grading queue processing complete');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});