export function detectComplete(text: string): boolean {
  return text.includes('<complete>') || text.includes('<promise>COMPLETE</promise>')
}

export function detectBlocked(text: string): { blocked: true; reason: string } | null {
  const match = text.match(/<blocked>(.*?)<\/blocked>/s)
  if (match) return { blocked: true, reason: match[1].trim() }

  const legacyMatch = text.match(/<promise>BLOCKED:([\s\S]*?)<\/promise>/)
  if (legacyMatch) return { blocked: true, reason: legacyMatch[1].trim() }

  return null
}

export function detectDecide(text: string): { decide: true; question: string } | null {
  const match = text.match(/<decide>(.*?)<\/decide>/s)
  if (match) return { decide: true, question: match[1].trim() }

  const legacyMatch = text.match(/<promise>DECIDE:([\s\S]*?)<\/promise>/)
  if (legacyMatch) return { decide: true, question: legacyMatch[1].trim() }

  return null
}
