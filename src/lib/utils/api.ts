import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";

/**
 * API Utilities for Content Refinery
 * Provides safe JSON parsing, standardized responses, and error handling
 */

// ============================================
// TYPES
// ============================================

export interface ApiError {
  error: string;
  details?: unknown;
  code?: string;
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

// ============================================
// JSON PARSING
// ============================================

/**
 * Safely parse JSON from a request body
 * Returns null if parsing fails instead of throwing
 */
export async function safeJsonParse<T = unknown>(
  request: NextRequest
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await request.json();
    return { data: data as T, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return { data: null, error: `Failed to parse request body: ${message}` };
  }
}

/**
 * Parse and validate request body against a Zod schema
 */
export async function parseAndValidate<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T | null; error: NextResponse | null }> {
  // First, safely parse JSON
  const { data: rawData, error: parseError } = await safeJsonParse(request);

  if (parseError) {
    return {
      data: null,
      error: NextResponse.json({ error: parseError }, { status: 400 }),
    };
  }

  // Then validate against schema
  const result = schema.safeParse(rawData);

  if (!result.success) {
    return {
      data: null,
      error: NextResponse.json(
        {
          error: "Validation failed",
          details: formatZodError(result.error),
        },
        { status: 400 }
      ),
    };
  }

  return { data: result.data, error: null };
}

/**
 * Format Zod errors into a more readable structure
 */
export function formatZodError(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "root";
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  status: number = 500,
  details?: unknown
): NextResponse<ApiError> {
  const body: ApiError = { error: message };
  if (details !== undefined) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data?: T,
  status: number = 200,
  message?: string
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      success: true as const,
      ...(data !== undefined && { data }),
      ...(message && { message }),
    },
    { status }
  );
}

/**
 * Create a 400 Bad Request response
 */
export function badRequest(message: string, details?: unknown): NextResponse<ApiError> {
  return errorResponse(message, 400, details);
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorized(message: string = "Unauthorized"): NextResponse<ApiError> {
  return errorResponse(message, 401);
}

/**
 * Create a 403 Forbidden response
 */
export function forbidden(message: string = "Forbidden"): NextResponse<ApiError> {
  return errorResponse(message, 403);
}

/**
 * Create a 404 Not Found response
 */
export function notFound(resource: string = "Resource"): NextResponse<ApiError> {
  return errorResponse(`${resource} not found`, 404);
}

/**
 * Create a 501 Not Implemented response
 */
export function notImplemented(feature: string): NextResponse<ApiError> {
  return errorResponse(`${feature} is not yet implemented`, 501);
}

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Wrap an API handler with standardized error handling
 * Catches errors, logs them, and returns appropriate responses
 */
export function withErrorHandler<T>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>
): (request: NextRequest) => Promise<NextResponse<T | ApiError>> {
  return async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (error) {
      // Log the full error for debugging
      console.error("[API Error]", {
        url: request.url,
        method: request.method,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Return a safe error response
      const message = error instanceof Error ? error.message : "Internal server error";
      return errorResponse(message, 500);
    }
  };
}

// ============================================
// JSON EXTRACTION FROM AI RESPONSES
// ============================================

/**
 * Find matching bracket in string, handling nested brackets
 */
function findMatchingBracket(text: string, startIndex: number, openBracket: string, closeBracket: string): number {
  let depth = 1;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex + 1; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === openBracket) depth++;
    if (char === closeBracket) depth--;

    if (depth === 0) return i;
  }

  return -1;
}

/**
 * Extract JSON from AI response text
 * Handles cases where JSON is wrapped in markdown code blocks or text
 * Properly handles nested braces in HTML/CSS content
 */
export function extractJsonFromText<T>(
  text: string,
  type: "object" | "array" = "object"
): { data: T | null; error: string | null } {
  const openBracket = type === "array" ? "[" : "{";
  const closeBracket = type === "array" ? "]" : "}";

  // First, try to extract from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    const codeContent = codeBlockMatch[1].trim();
    try {
      const parsed = JSON.parse(codeContent);
      return { data: parsed as T, error: null };
    } catch {
      // Code block content wasn't valid JSON, continue searching
    }
  }

  // Find the first open bracket
  const startIndex = text.indexOf(openBracket);
  if (startIndex === -1) {
    return {
      data: null,
      error: `No valid JSON ${type} found in response`
    };
  }

  // Find the matching close bracket
  const endIndex = findMatchingBracket(text, startIndex, openBracket, closeBracket);
  if (endIndex === -1) {
    return {
      data: null,
      error: `No valid JSON ${type} found in response - unmatched brackets`
    };
  }

  const jsonString = text.substring(startIndex, endIndex + 1);

  try {
    const parsed = JSON.parse(jsonString);
    return { data: parsed as T, error: null };
  } catch (e) {
    // Try one more time with the raw text
    try {
      const parsed = JSON.parse(text);
      return { data: parsed as T, error: null };
    } catch {
      return {
        data: null,
        error: `No valid JSON ${type} found in response`
      };
    }
  }
}

/**
 * Safely extract and validate JSON from AI response
 */
export function extractAndValidate<T>(
  text: string,
  schema: ZodSchema<T>,
  type: "object" | "array" = "object"
): { data: T | null; error: string | null } {
  const { data, error } = extractJsonFromText<unknown>(text, type);

  if (error || data === null) {
    return { data: null, error: error || "No data extracted" };
  }

  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      data: null,
      error: `Validation failed: ${result.error.issues.map(i => i.message).join(", ")}`,
    };
  }

  return { data: result.data, error: null };
}
