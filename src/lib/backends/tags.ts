export function hasCompleteTag(text: string): boolean {
  return /<complete>/i.test(text)
}

export function hasBlockedTag(text: string): boolean {
  return /<blocked>/i.test(text)
}

export function hasDecideTag(text: string): boolean {
  return /<decide>/i.test(text)
}

export function extractBlockedReason(text: string): string {
  const match = /<blocked>([\s\S]*?)<\/blocked>/i.exec(text)
  return match?.[1]?.trim() ?? 'Agent is blocked and needs human input.'
}

export function extractDecideQuestion(text: string): string {
  const match = /<decide>([\s\S]*?)<\/decide>/i.exec(text)
  return match?.[1]?.trim() ?? 'Agent needs a decision from you.'
}
