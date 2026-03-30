export async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Request failed.");
  }

  return payload as T;
}
