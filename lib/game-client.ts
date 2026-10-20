// Browser helpers shared by the game leaderboard clients. Every failure rejects with an ApiError; a game treats that as
// "leaderboard unavailable" and carries on from local progress.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, { ...init, cache: 'no-store' })
  } catch {
    throw new ApiError('Network error', 0)
  }
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(typeof body?.error === 'string' ? body.error : 'Request failed', response.status)
  return body as T
}
