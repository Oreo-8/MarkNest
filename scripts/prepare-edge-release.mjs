import { copyFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

import packageJson from '../package.json' with { type: 'json' }

const outputDirectory = resolve(import.meta.dirname, '..', '.output')
const chromeArchive = resolve(outputDirectory, `marknest-${packageJson.version}-chrome.zip`)
const edgeArchive = resolve(outputDirectory, `marknest-${packageJson.version}-edge.zip`)

await copyFile(chromeArchive, edgeArchive)
const { size } = await stat(edgeArchive)

console.log(`Edge submission package: ${edgeArchive} (${(size / 1024 / 1024).toFixed(2)} MB)`)
