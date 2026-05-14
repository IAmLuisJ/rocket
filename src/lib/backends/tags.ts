export function hasCompleteTag(text: string): boolean {
  return /<complete>/i.test(text) || /<promise>COMPLETE<\/promise>/i.test(text)
}

export function hasBlockedTag(text: string): boolean {
  return /<blocked>/i.test(text) || /<promise>BLOCKED:[\s\S]*?<\/promise>/i.test(text)
}

export function hasDecideTag(text: string): boolean {
  return /<decide>/i.test(text) || /<promise>DECIDE:[\s\S]*?<\/promise>/i.test(text)
}

export function extractBlockedReason(text: string): string {
  const match = /<blocked>([\s\S]*?)<\/blocked>/i.exec(text)
  if (match?.[1]) return match[1].trim()

  const legacyMatch = /<promise>BLOCKED:([\s\S]*?)<\/promise>/i.exec(text)
  return legacyMatch?.[1]?.trim() ?? 'Agent is blocked and needs human input.'
}

export function extractDecideQuestion(text: string): string {
  const match = /<decide>([\s\S]*?)<\/decide>/i.exec(text)
  if (match?.[1]) return match[1].trim()

  const legacyMatch = /<promise>DECIDE:([\s\S]*?)<\/promise>/i.exec(text)
  return legacyMatch?.[1]?.trim() ?? 'Agent needs a decision from you.'
}
