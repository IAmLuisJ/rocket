import { readFile, writeFile, copyFile, readdir, mkdir } from 'fs/promises'
import { join, extname } from 'path'

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  '.zip',
  '.tar',
  '.gz',
  '.pdf',
])

function isBinary(filePath: string): boolean {
  return BINARY_EXTENSIONS.has(extname(filePath).toLowerCase())
}

function replaceTokens(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return key in vars ? vars[key] : match
  })
}

export async function processTemplate(
  src: string,
  dest: string,
  vars: Record<string, string>,
): Promise<void> {
  await mkdir(dest, { recursive: true })
  const entries = await readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    // Strip .tmpl extension from output filename
    const destName = entry.name.endsWith('.tmpl') ? entry.name.slice(0, -5) : entry.name
    const destPath = join(dest, destName)

    if (entry.isDirectory()) {
      await processTemplate(srcPath, destPath, vars)
    } else if (isBinary(srcPath)) {
      await copyFile(srcPath, destPath)
    } else {
      const content = await readFile(srcPath, 'utf-8')
      const processed = replaceTokens(content, vars)
      await writeFile(destPath, processed, 'utf-8')
    }
  }
}
