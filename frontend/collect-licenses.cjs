// Retain dependency notices alongside the distributed browser bundle.
const fs = require('node:fs')
const path = require('node:path')
function walk(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const source = path.join(directory, item.name)
    if (item.isDirectory()) walk(source)
    else if (item.isFile() && /^(license|licence|copying|notice)/i.test(item.name)) {
      const target = path.join('dist', 'licenses', path.relative('node_modules', source))
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.copyFileSync(source, target)
    }
  }
}
walk('node_modules')
