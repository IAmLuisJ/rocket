import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const FEATURES_SECTION = '## Features Added'

export function appendFeatureSpec(projectRoot: string, specMarkdown: string): string {
  const prdPath = join(projectRoot, '.agent', 'prd', 'PRD.md')
  let content = readFileSync(prdPath, 'utf-8')

  const block = `\n### ${new Date().toISOString().slice(0, 10)}\n\n${specMarkdown}\n`

  if (content.includes(FEATURES_SECTION)) {
    // Append under the existing section
    const idx = content.indexOf(FEATURES_SECTION)
    const insertAt = idx + FEATURES_SECTION.length
    content = content.slice(0, insertAt) + '\n' + block + content.slice(insertAt)
  } else {
    // Create the section at the end
    content = content.trimEnd() + '\n\n' + FEATURES_SECTION + '\n' + block
  }

  writeFileSync(prdPath, content, 'utf-8')
  return FEATURES_SECTION
}
