export interface JsonStreamResult {
  type: 'json' | 'text'
  content: string
  parsed?: unknown
}

export class JsonStreamParser {
  private buffer = ''

  feed(line: string): JsonStreamResult {
    // Try parsing the line as standalone JSON first
    const standalone = this.tryParse(line)
    if (standalone !== null) {
      this.buffer = ''
      return { type: 'json', content: line, parsed: standalone }
    }

    // Buffer partial JSON
    if (this.buffer) {
      this.buffer += '\n' + line
      const buffered = this.tryParse(this.buffer)
      if (buffered !== null) {
        const content = this.buffer
        this.buffer = ''
        return { type: 'json', content, parsed: buffered }
      }
      return { type: 'text', content: line }
    }

    // Check if this might be the start of multi-line JSON
    const trimmed = line.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      this.buffer = line
      return { type: 'text', content: line }
    }

    return { type: 'text', content: line }
  }

  private tryParse(text: string): unknown | null {
    try {
      return JSON.parse(text) as unknown
    } catch {
      return null
    }
  }
}
