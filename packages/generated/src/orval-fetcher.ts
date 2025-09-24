/*
 * Shared fetch helper for orval-generated clients.
 * Ensures JSON responses come back with the correct typed payload
 * and keeps the { status, data } envelope expected across callers.
 */

type ExtractPromise<T> = T extends Promise<infer U> ? U : T;
type ResponseData<T> = ExtractPromise<T> extends { data: infer U } ? U : never;
type ResponseShape<T> =
  ExtractPromise<T> extends { data: ResponseData<T>; status: number }
    ? ExtractPromise<T>
    : never;

const hasJsonBody = (response: Response): boolean => {
  if (response.status === 204) {
    return false;
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength === '0') {
    return false;
  }

  const contentType = response.headers.get('content-type');
  return contentType !== null && contentType.includes('application/json');
};

export async function orvalFetch<TResponse>(
  url: string,
  init?: RequestInit
): Promise<ResponseShape<TResponse>> {
  const response = await fetch(url, init);

  let data: ResponseData<TResponse>;
  if (hasJsonBody(response)) {
    data = (await response.json()) as ResponseData<TResponse>;
  } else {
    data = undefined as ResponseData<TResponse>;
  }

  const result = {
    status: response.status,
    data,
  } as ResponseShape<TResponse>;

  return result;
}
