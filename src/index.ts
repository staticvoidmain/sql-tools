
import { printNodes } from './visitor'
import { Parser } from './parser'

import { promisify } from 'util'

import {
  join,
  normalize
} from 'path'

import {
  readFile,
  readdir,
  statSync
} from 'fs'

const readDirAsync = promisify(readdir)
const readFileAsync = promisify(readFile)

const args = process.argv.slice(2)

if (!args) {
  process.stdout.write('no file or directory specified\n')
  process.exit(-1)
}

const pathOrFile = args[0]

// todo: support multiple debugging ops,
// like a linting visitor
const operation = args[1] || 'print'

if (pathOrFile.indexOf('*') == -1) {
  const path = normalize(join(process.cwd(), pathOrFile))

  processFile(path)
} else {
  // else it's a pattern.
  // relative OR absolute
  // ex: ./somedir/sql/*.sql
  const prefix = pathOrFile.substr(0, pathOrFile.indexOf('*'))
  const suffix = pathOrFile.substring(prefix.length)

  if (suffix.indexOf('**') != -1) {
    process.stderr.write('glob patterns not implemented')
    process.exit(-1)
  }

  const root = normalizeRootDirectory(prefix)

  // .+\.sql$
  const pattern = new RegExp(suffix.replace('.', '\\.').replace('*', '.+') + '$')

  processDirectory(root, pattern)
}

/**
 * Converts a relative or abs path to an abs path
 * @param prefix a string containing a relative or absolute path
 */
function normalizeRootDirectory(prefix: string) {
  return !pathOrFile.startsWith('.')
    ? normalize(prefix)
    : normalize(join(process.cwd(), prefix))
}

async function processDirectory(dir: string, pattern: RegExp) {
  const contents = await readDirAsync(dir)

  if (contents) {
    for (let i = 0; i < contents.length; i++) {
      const child = contents[i]
      const path = join(dir, child)
      const stat = statSync(path)

      if (stat.isFile()) {
        if (pattern.test(child)) {
          console.log('\n\n## parsing: ' + path)

          await processFile(path)
        }
      }
      // else if (stat.isDirectory()) {
      //   // todo: does it match the pattern?
      //   processDirectory(element, true)
      // }
    }
  }
}

async function processFile(path: string) {
  const file = await readFileAsync(path, 'utf8')
  const parser = new Parser()
  const tree = parser.parse(file, {
    skipTrivia: true,
    path: path
  })

  printNodes(tree)
}

