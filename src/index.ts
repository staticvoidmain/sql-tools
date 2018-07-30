
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

import { SyntaxNode, BinaryExpression, LiteralExpression, BinaryOperator, Expr, WhereClause, JoinedTable, IdentifierExpression, UnaryExpression, FunctionCallExpression } from './ast'
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

const operation = args[1] || '--print'

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
          await processFile(path)
        }
      }
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

  if (operation === '--print') {
    printNodes(tree)
  }

  if (operation === '--lint') {
    const visitor = new ExampleLintVisitor(parser)

    for (const node of tree) {
      visitor.visit(node)
    }
  }
}

// # Utils
// todo: start pulling these out into utils
function isNullLiteral(node: SyntaxNode) {
  if (node.kind === SyntaxKind.literal_expr) {
    const literal = <LiteralExpression>node

    if (literal.value === 'null') {
      return true
    }
  }

  return false
}

function isComparison(op: BinaryOperator) {
  switch (op.kind) {
    case SyntaxKind.equal:
    case SyntaxKind.lessThan:
    case SyntaxKind.lessThanEqual:
    case SyntaxKind.notEqual:
    case SyntaxKind.ltGt:
    case SyntaxKind.greaterThan:
    case SyntaxKind.greaterThanEqual:
    case SyntaxKind.notLessThan:
    case SyntaxKind.notGreaterThan:
      return true
  }

  return false
}

function isUnary(expr: Expr) {
  const kind = expr.kind
  return kind === SyntaxKind.unary_minus_expr
    || kind === SyntaxKind.unary_plus_expr
    || kind === SyntaxKind.bitwise_not_expr
    || kind === SyntaxKind.logical_not_expr
    || kind === SyntaxKind.null_test_expr
}

// this is not deep equality,
// and we aren't trying to solve SAT
function exprEquals(left: Expr, right: Expr) {
  if (left.kind !== right.kind) {
    return false
  }

  if (left.kind === SyntaxKind.literal_expr) {
    return (<LiteralExpression>left).value === (<LiteralExpression>right).value
  }

  if (left.kind === SyntaxKind.identifier_expr) {
    // todo: match identifiers more thoughtfully
    // through an alias... could be a fully qualified
    // table name kind of thing.
    const leftIdent = (<IdentifierExpression>left).identifier
    const rightIdent = (<IdentifierExpression>right).identifier

    if (leftIdent.parts.length !== rightIdent.parts.length) {
      return false
    }

    for (let i = 0; i < leftIdent.parts.length; i++) {
      if (leftIdent.parts[i] !== rightIdent.parts[i]) {
        return false
      }
    }

    return true
  }
}

function walkExpr(expr: Expr, cb: (e: Expr) => void) {
  cb(expr)

  if (expr.kind === SyntaxKind.binary_expr) {
    const binary = <BinaryExpression>expr

    walkExpr(binary.left, cb)
    walkExpr(binary.right, cb)
    return
  }

  if (isUnary(expr)) {
    const unary = <UnaryExpression>expr

    walkExpr(unary.expr, cb)
    return
  }

  if (expr.kind === SyntaxKind.function_call_expr) {
    const call = <FunctionCallExpression>expr

    if (call.arguments) {
      call.arguments.forEach(arg => walkExpr(arg, cb))
    }
    return
  }

  // todo: visit these exprs
  if (expr.kind === SyntaxKind.searched_case_expr) { }
  if (expr.kind === SyntaxKind.simple_case_expr) { }
}

class ExampleLintVisitor extends Visitor {
  constructor(private parser: Parser) {
    super()
  }

  /**
   * display a warning for the current node, optionally underlining a child
   * node to provide more clarity
   */
  warning(node: SyntaxNode, message: string, underlineNode?: SyntaxNode) {
    let space = '    '
    const [file, line, col, text] = this.parser.getInfo(node)
    console.log(`${file}:${line + 1}:${col + 1} - warning ${message}\n`)
    console.log(space + text)

    // either underline the whole thing
    // or a smaller subset.
    underlineNode = underlineNode || node

    let underline = '~'
    const width = underlineNode.end - underlineNode.start

    if (width > 0) {
      for (let i = 0; i < width; i++) {
        underline += '~'
      }
    }

    const offsetLeft = underlineNode.start - node.start
    for (let j = 0; j < offsetLeft; j++) {
      space += ' '
    }

    console.log(space + underline)
    console.log('\n')
  }

  visitWhere(node: WhereClause) {
    walkExpr(node.predicate, (e: Expr) => {
      if (e.kind === SyntaxKind.function_call_expr) {
        // todo: no args or constant args skips this warning
        this.warning(e, 'function call will prevent search optimization')
      }
    })
  }

  visitJoin(node: JoinedTable) {
    walkExpr(node.on, (e: Expr) => {
      // todo: are case exprs sargable?
      // simple vs searched? does that make a difference?
      if (e.kind === SyntaxKind.function_call_expr) {
        // todo: args could be constant
        this.warning(e, 'function call will prevent search optimization')
      }
    })
  }

  visitBinaryExpression(node: BinaryExpression) {
    if (isNullLiteral(node.left) || isNullLiteral(node.right)) {
      this.warning(node, 'null literal used in comparison, use "is null" or "is not null" instead', node.op)
    } else {
      if (isComparison(node.op) && exprEquals(node.left, node.right)) {
        this.warning(node, 'value compared with itself, result will always be constant')
      }
    }

    // todo: like other than 'startsWith%'
  }
}
