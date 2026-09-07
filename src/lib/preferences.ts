/** Optional onboarding flags must never prevent planning in restricted browsers. */
const seen = new Set<string>()
export function hasSeen(key: string): boolean {
  if (seen.has(key)) return true
  try { return localStorage.getItem(key) === '1' } catch { return false }
}
export function markSeen(key: string): void {
  seen.add(key)
  try { localStorage.setItem(key, '1') } catch { /* Keep the flag for this session. */ }
}
