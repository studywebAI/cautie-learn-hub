// Simple logging utility for debugging
export const logger = {
  info: (context: string, message: string, data?: any) => {
    console.log(`[INFO][${context}] ${message}`, data || '');
  },
  error: (context: string, message: string, error?: any) => {
    console.error(`[ERROR][${context}] ${message}`, error || '');
  },
  warn: (context: string, message: string, data?: any) => {
    console.warn(`[WARN][${context}] ${message}`, data || '');
  },
  debug: (context: string, message: string, data?: any) => {
    console.log(`[DEBUG][${context}] ${message}`, data || '');
  },
};

// Helper to log API requests
export function logApiRequest(method: string, path: string, params?: any, body?: any) {
  console.log(`\n🌐 API REQUEST: ${method} ${path}`);
  console.log('  Params:', JSON.stringify(params, null, 2));
  if (body) console.log('  Body:', JSON.stringify(body, null, 2));
  console.log('---');
}

// Helper to log API responses
export function logApiResponse(method: string, path: string, status: number, data?: any, error?: any) {
  if (error || status >= 400) {
    console.log(`❌ API RESPONSE: ${method} ${path} -> ${status}`);
    console.log('  Error:', error || data);
  } else {
    console.log(`✅ API RESPONSE: ${method} ${path} -> ${status}`);
    if (data) console.log('  Data:', JSON.stringify(data, null, 2).substring(0, 500));
  }
  console.log('---');
}
