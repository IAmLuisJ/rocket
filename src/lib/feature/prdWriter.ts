import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const FEATURES_SECTION = '## Features Added'

export async function writeFeatureSpec(specMarkdown: string, prdPath: string): Promise<string> {
  const content = await readFile(prdPath, 'utf-8').catch(() => '')
  const trimmedSpec = specMarkdown.trim()

  if (trimmedSpec.length > 0 && content.includes(trimmedSpec.slice(0, 100))) {
    return FEATURES_SECTION
  }

  const nextContent = content.includes(FEATURES_SECTION)
    ? `${content.trimEnd()}\n\n${trimmedSpec}\n`
    : `${content.trimEnd()}\n\n${FEATURES_SECTION}\n\n${trimmedSpec}\n`

  await writeFile(prdPath, nextContent.trimStart(), 'utf-8')
  return FEATURES_SECTION
}

export async function appendFeatureSpec(
  projectRoot: string,
  specMarkdown: string,
): Promise<string> {
  const prdPath = join(projectRoot, '.agent', 'prd', 'PRD.md')
  return writeFeatureSpec(specMarkdown, prdPath)
}
