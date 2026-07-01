// =================================================================
// Client helper for calling /api/host/* routes.
//
// When the server is deployed with VELTRIX_HOST_TOKEN set, every host route
// requires the x-veltrix-host-token header (see src/lib/host-guard.ts). The
// browser app supplies it from the build-time public env
// NEXT_PUBLIC_VELTRIX_HOST_TOKEN. When no token is configured, these helpers
// behave exactly like a plain JSON fetch.
// =================================================================

export const HOST_TOKEN_HEADER = "x-veltrix-host-token";

/** Build headers for a host request: JSON content type + optional token. */
export function hostHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(extra || {}) };
  const token = process.env.NEXT_PUBLIC_VELTRIX_HOST_TOKEN;
  if (token) headers[HOST_TOKEN_HEADER] = token;
  return headers;
}

/** fetch() wrapper that injects the host token header for /api/host/* calls. */
export function hostFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const provided = (init.headers as Record<string, string> | undefined) || undefined;
  return fetch(input, { ...init, headers: hostHeaders(provided) });
}
