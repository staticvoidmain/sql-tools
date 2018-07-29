
import { printNodes } from './print_visitor'
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

import { SyntaxNode, BinaryExpression, LiteralExpression } from './ast'
import { Visitor } from './abstract_visitor'
import { SyntaxKind } from './syntax'

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

  if (operation === 'print') {
    printNodes(tree)
  }

  if (operation === 'lint') {
    const visitor = new ExampleLintVisitor(parser)

    for (const node of tree) {
      visitor.visit(node)
    }
  }
}

function lint(nodes: ReadonlyArray<SyntaxNode>, parser: Parser) {

}

class ExampleLintVisitor extends Visitor {
  constructor(private parser: Parser) {
    super()
  }

  isNullLiteral(node: SyntaxNode) {
    if (node.kind === SyntaxKind.literal_expr) {
      const literal = <LiteralExpression>node

      if (literal.value === 'null') {
        return true
      }
    }

    return false
  }

  // todo:
  flagNode(node: SyntaxNode) {

  }

  visitBinaryExpression(node: BinaryExpression) {
    if (this.isNullLiteral(node.left) || this.isNullLiteral(node.right)) {
      // okay this leads us into the whole
      // finish node business, where the node has a start and an end
      const [line, col, text] = this.parser.getInfo(node)

      console.log(`(${line + 1}, ${col + 1}) ${text}`)
      console.log('null literal used in binary expr, use "is null" or "is not null"')
    }
  }
}
