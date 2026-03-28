export function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }
  const seconds = Math.round(ms / 1000)
  return `${seconds}s`
}
