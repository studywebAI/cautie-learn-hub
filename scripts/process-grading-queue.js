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

  try {
    const response = await fetch(`${BASE_URL}/api/ai/process-grading-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      if (result.results?.length > 0) {
      }
    } else {
      const errorText = await response.text();
    }
  } catch (error) {
  }
}

// Run the processing
processGradingQueue().then(() => {
  process.exit(0);
}).catch((error) => {
  process.exit(1);
});