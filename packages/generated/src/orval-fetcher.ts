/**
 * Shared fetch helper for orval-generated clients.
 * Ensures JSON responses come back with the correct typed payload
 * and keeps the { status, data } envelope expected across callers.
 */

/**
 * Standard response envelope for all API calls
 */
export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
}

/**
 * Checks if the response has a JSON body based on status and headers
 */
const hasJsonBody = (response: Response): boolean => {
  // No content responses
  if (response.status === 204) {
    return false;
  }

  // Empty content-length
  const contentLength = response.headers.get('content-length');
  if (contentLength === '0') {
    return false;
  }

  // Check content-type
  const contentType = response.headers.get('content-type');
  return contentType !== null && contentType.includes('application/json');
};

/**
 * Custom fetch mutator for orval that normalizes all responses to { status, data } format
 * This eliminates the need for manual type assertions in generated clients
 *
 * Note: orval passes Promise<T> as the type parameter, so we need to handle that
 */
export async function orvalFetch<T>(
  url: string,
  init?: RequestInit
): Promise<T extends Promise<infer U> ? U : T> {
  const response = await fetch(url, init);

  let data: unknown;
  if (hasJsonBody(response)) {
    data = await response.json();
  } else {
    data = undefined;
  }

  const result = {
    status: response.status,
    data,
  };

  return result as T extends Promise<infer U> ? U : T;
}
