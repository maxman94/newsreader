import type { HandlerEvent } from "@netlify/functions";

export function json(statusCode: number, body: unknown, headers?: Record<string, string>) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

export function redirect(location: string, headers?: Record<string, string>) {
  return {
    statusCode: 302,
    headers: {
      location,
      "cache-control": "no-store",
      ...headers,
    },
    body: "",
  };
}

export function parseJsonBody<T>(event: HandlerEvent): T | null {
  if (!event.body) {
    return null;
  }

  return JSON.parse(event.body) as T;
}

export function getRequestOrigin(event: HandlerEvent) {
  const forwardedProto = event.headers["x-forwarded-proto"];
  const host = event.headers["x-forwarded-host"] ?? event.headers.host;
  const proto = forwardedProto ?? (host?.includes("localhost") ? "http" : "https");

  if (!host) {
    throw new Error("Unable to determine request host.");
  }

  return `${proto}://${host}`;
}

export function isSecureRequest(event: HandlerEvent) {
  const forwardedProto = event.headers["x-forwarded-proto"];
  return forwardedProto === "https";
}

export function jsonResponse(body: unknown, init?: number | ResponseInit) {
  const responseInit = typeof init === "number" ? { status: init } : (init ?? {});

  return Response.json(body, {
    ...responseInit,
    headers: {
      "cache-control": "no-store",
      ...(responseInit.headers ?? {}),
    },
  });
}

export async function parseRequestJson<T>(request: Request): Promise<T | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await request.json()) as T;
}
