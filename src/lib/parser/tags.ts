export function detectComplete(text: string): boolean {
  return text.includes('<complete>')
}

export function detectBlocked(text: string): { blocked: true; reason: string } | null {
  const match = text.match(/<blocked>(.*?)<\/blocked>/s)
  if (!match) return null
  return { blocked: true, reason: match[1].trim() }
}

export function detectDecide(text: string): { decide: true; question: string } | null {
  const match = text.match(/<decide>(.*?)<\/decide>/s)
  if (!match) return null
  return { decide: true, question: match[1].trim() }
}
