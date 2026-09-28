import JSZip from 'jszip'
import { writeFileSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const root = process.cwd()
const zip = new JSZip()
const excludeDirs = new Set(['node_modules', 'dist', '.git', '.v3', 'android'])
const excludeFiles = new Set(['.env', '.env.local', 'package-lock.json', 'arise-apex-personal-evolution-system.zip', 'POS-2.1-PERFECT-MOBILE-FINAL.zip'])

function addDir(dir, zipFolder) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (excludeDirs.has(entry.name)) continue
      addDir(fullPath, zipFolder.folder(entry.name))
    } else {
      if (excludeFiles.has(entry.name)) continue
      zipFolder.file(entry.name, readFileSync(fullPath))
    }
  }
}

addDir(root, zip)
const outPath = join(root, 'POS-2.1-PERFECT-MOBILE-FINAL.zip')
const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
writeFileSync(outPath, content)
console.log(`Created ${outPath} (${(content.length / 1024).toFixed(0)} KB)`)
