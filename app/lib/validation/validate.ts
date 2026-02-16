import { validate as zodValidate, formatValidationErrors } from './schemas';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware helper to validate request body in API routes
 * @param request - The NextRequest or Request object
 * @param schema - Zod schema to validate against
 * @returns Validated data or NextResponse with error
 */
export async function validateBody<T>(
  request: NextRequest | Request,
  schema: import('zod').ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await request.json();
    const result = zodValidate(schema, body);
    
    if (!result.success) {
      return {
        error: NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: formatValidationErrors(result.errors)
          },
          { status: 400 }
        )
      };
    }
    
    return { data: result.data };
  } catch (error) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON body'
        },
        { status: 400 }
      )
    };
  }
}

/**
 * Middleware helper to validate search params in API routes
 * @param request - The NextRequest object
 * @param schema - Zod schema to validate against
 * @returns Validated data or NextResponse with error
 */
export async function validateSearchParams<T>(
  request: NextRequest,
  schema: import('zod').ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params = Object.fromEntries(searchParams.entries());
    const result = zodValidate(schema, params);
    
    if (!result.success) {
      return {
        error: NextResponse.json(
          { 
            success: false, 
            error: 'Validation failed', 
            details: formatValidationErrors(result.errors) 
          },
          { status: 400 }
        )
      };
    }
    
    return { data: result.data };
  } catch (error) {
    return {
      error: NextResponse.json(
        { 
          success: false, 
          error: 'Invalid search parameters' 
        },
        { status: 400 }
      )
    };
  }
}

/**
 * Wrapper for API route handlers that adds automatic validation
 * @param handler - The actual route handler function
 * @param schema - Zod schema to validate request body
 * @returns Wrapped handler function
 */
export function withValidation<T>(
  handler: (data: T) => Promise<Response | NextResponse>,
  schema: import('zod').ZodSchema<T>
) {
  return async (request: NextRequest): Promise<Response | NextResponse> => {
    const validation = await validateBody(request, schema);
    if ('error' in validation) {
      return validation.error;
    }
    
    return handler(validation.data);
  };
}
