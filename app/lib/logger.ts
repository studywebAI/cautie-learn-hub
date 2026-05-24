// Simple logging utility for debugging
export const logger = {
  info: (context: string, message: string, data?: any) => {
    // Logging disabled in production
  },
  error: (context: string, message: string, error?: any) => {
    // Logging disabled in production
  },
  warn: (context: string, message: string, data?: any) => {
    // Logging disabled in production
  },
  debug: (context: string, message: string, data?: any) => {
    // Logging disabled in production
  },
};

// Helper to log API requests
export function logApiRequest(method: string, path: string, params?: any, body?: any) {
  // Logging disabled in production
}

// Helper to log API responses
export function logApiResponse(method: string, path: string, status: number, data?: any, error?: any) {
  // Logging disabled in production
}
