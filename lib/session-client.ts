/**
 * Client-side session fetch with in-flight de-dupe + tiny cache.
 * Prevents multiple components/effects from spamming `/api/auth/session`
 * on refresh (especially in dev + StrictMode).
 */

export type ClientSessionResponse = {
  user: { id: string; email?: string } | null
  profile: unknown | null
}

let inFlight: Promise<ClientSessionResponse> | null = null
let lastValue: ClientSessionResponse | null = null
let lastAt = 0

export async function fetchSessionCached(opts?: { force?: boolean; ttlMs?: number }) {
  const force = opts?.force ?? false
  const ttlMs = opts?.ttlMs ?? 1000

  const now = Date.now()
  if (!force && lastValue && now - lastAt < ttlMs) return lastValue
  if (inFlight) return inFlight

  inFlight = fetch('/api/auth/session', { credentials: 'include' })
    .then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as Partial<ClientSessionResponse>
      const value: ClientSessionResponse = {
        user: (data.user as ClientSessionResponse['user']) ?? null,
        profile: (data.profile as ClientSessionResponse['profile']) ?? null,
      }
      lastValue = value
      lastAt = Date.now()
      return value
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

