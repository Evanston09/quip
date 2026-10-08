export class ApiError extends Error {
  constructor(
    message: string,
    public retryAt?: number,
    public retryable = true,
  ) {
    super(message);
  }
}
function baseUrl() {
  const url = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!url)
    throw new ApiError(
      "The coach is unavailable right now. Please try again later.",
    );
  return url;
}
export async function request(path: string, body: BodyInit, json = false, signal?: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const timeout = setTimeout(abort, 180000);
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method: "POST",
      body,
      headers: json ? { "Content-Type": "application/json" } : undefined,
      signal: controller.signal,
    });
    if (signal?.aborted) throw new Error("Practice setup cancelled.");
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "Could not reach the coach. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
  const data = await response.json();
  if (!response.ok) {
    const retry = response.headers.get("Retry-After");
    const retryAt = retry
      ? /^\d+$/.test(retry)
        ? Date.now() + Number(retry) * 1000
        : Date.parse(retry)
      : undefined;
    throw new ApiError(
      data.error?.message ?? "The coach could not finish. Please try again.",
      retryAt,
      data.error?.retryable !== false,
    );
  }
  return data;
}
