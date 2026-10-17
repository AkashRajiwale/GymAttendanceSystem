// Browser-side helper for calling the app's API routes.

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = Record<string, unknown>>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: options.method ?? (options.body ? "POST" : "GET"),
      headers: options.body ? { "content-type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "No internet connection. Please try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? "Something went wrong");
  return data as T;
}

/** Current IST clock time as "HH:mm", for pre-filling time pickers. */
export function nowTime() {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(11, 16);
}
