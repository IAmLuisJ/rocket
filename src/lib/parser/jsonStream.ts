export type ParsedLine = { type: 'json'; data: unknown } | { type: 'text'; content: string }

export function createJsonStreamParser(): {
  process(line: string): ParsedLine | null
} {
  let buffer = ''
  return {
    process(line: string): ParsedLine | null {
      if (!line.trim()) return null

      // If we have a buffer, append and try to parse
      if (buffer) {
        buffer += '\n' + line
        try {
          const data: unknown = JSON.parse(buffer)
          buffer = ''
          return { type: 'json', data }
        } catch {
          // Still incomplete — keep buffering
          return null
        }
      }

      // Try parsing standalone line
      try {
        const data: unknown = JSON.parse(line)
        return { type: 'json', data }
      } catch {
        // Check if this could be the start of multi-line JSON
        const trimmed = line.trim()
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          buffer = line
          return null
        }
        // Plain text
        return { type: 'text', content: line }
      }
    },
  }
}
