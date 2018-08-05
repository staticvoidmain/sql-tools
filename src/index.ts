
import { printNodes } from './print_visitor'
import { Parser, ParserException } from './parser'

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

import { SyntaxNode, BinaryExpression, LiteralExpression, BinaryOperator, Expr, WhereClause, JoinedTable, IdentifierExpression, UnaryExpression, FunctionCallExpression, SearchedCaseExpression, SimpleCaseExpression, ColumnExpression, SelectStatement, LikeExpression } from './ast'
import { Visitor } from './abstract_visitor'
import { SyntaxKind } from './syntax'
import { Token } from './scanner'
import { Chars } from './chars'
import { getFlagsForEdition } from './features'

const readDirAsync = promisify(readdir)
const readFileAsync = promisify(readFile)

const args = process.argv.slice(2)

if (!args) {
  process.stdout.write('no file or directory specified\n')
  process.exit(-1)
}

const pathOrFile = args[0]
const operation = args[1] || '--print'
const edition = args[2] || 'sql-server'

if (pathOrFile.indexOf('*') === -1) {
  const path = pathOrFile.startsWith('.')
    ? normalize(join(process.cwd(), pathOrFile))
    : pathOrFile

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
      const path = normalize(join(dir, child))
      const stat = statSync(path)

      if (stat.isFile()) {
        if (pattern.test(child)) {
          await processFile(path)
        }
      }
    }

    console.log(`Success: ${success} | Fail: ${fail}`)
  }
}

function bufferToString(buffer: Buffer) {
  let len = buffer.length

  if (len >= 2) {
    // funky big-endian conversion.
    if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
      len &= -2
      for (let i = 0; i < len; i += 2) {
        const temp = buffer[i]
        buffer[i] = buffer[i + 1]
        buffer[i + 1] = temp
      }

      return buffer.toString('utf16le', 2)
    }

    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
      return buffer.toString('utf16le', 2)
    }

    if (len >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return buffer.toString('utf8', 3)
    }
  }

  return buffer.toString('utf8')
}

let success = 0, fail = 0

async function processFile(path: string) {
  const buff = await readFileAsync(path)
  const text = bufferToString(buff)

  const parser = new Parser(text, {
    debug: true,
    skipTrivia: true,
    path: path,
    features: getFlagsForEdition(edition, '2016'), // hack: fix this later
  })

  try {
    const tree = parser.parse()
    success++
    if (operation === '--print') {
      // console.log('# ' + path)
      // printNodes(tree)
      // console.log('\n')
    }

    if (operation === '--lint') {
      const visitor = new ExampleLintVisitor(parser)

      for (const node of tree) {
        visitor.visit(node)
      }

      // do some casing stuff
      for (const key of parser.getKeywords()) {
        visitor.visitKeyword(key)
      }
    }
  }
  catch (e) {
    fail++
    if (e instanceof ParserException) {
      const ex = <ParserException>e
      console.log(ex.message)
      console.log('AST backtrace:')
      printNodes(ex.nodes)
    }
    else console.log(e)
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

function isUpperChar(n: number) {
  return Chars.A <= n && n <= Chars.Z
}

function isLowerChar(n: number) {
  return Chars.a <= n && n <= Chars.a
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

  if (expr.kind === SyntaxKind.searched_case_expr) {
    const searched = <SearchedCaseExpression>expr

    searched.cases.forEach(c => {
      walkExpr(c.when, cb)
      walkExpr(c.then, cb)
    })

    walkExpr(searched.else, cb)
    return
  }

  if (expr.kind === SyntaxKind.simple_case_expr) {
    const simple = <SimpleCaseExpression>expr
    walkExpr(simple.input_expression, cb)

    simple.cases.forEach(c => {
      walkExpr(c.when, cb)
      walkExpr(c.then, cb)
    })

    walkExpr(simple.else, cb)
    return
  }
}

function hasLeadingPrefix(pattern: string) {
  // should start with something other than %, _, or [
  return /^[^_\[%]+/.test(pattern)
}

type Span =
  | SyntaxNode
  | Token

class ExampleLintVisitor extends Visitor {
  constructor(private parser: Parser) {
    super()
  }

  /**
   * display a warning for the current node, optionally underlining a child
   * node to provide more clarity
   */
  private warning(message: string, node: Span, underlineNode = node, category = ' ') {
    this.emit(message, node, underlineNode, 'warning', category)
  }

  private info(message: string, node: Span, underlineNode = node, category = ' ') {
    this.emit(message, node, underlineNode, 'info', category)
  }

  private emit(message: string, node: Span, underlineNode = node, severity = 'warning', category = ' ') {
    let space = '    '
    const [file, line, col, text] = this.parser.getInfo(node)

    // todo: message = chalk.color(message) based on severity
    console.log(`${file}:${line + 1}:${col + 1} - ${severity} -${category}${message}\n`)
    console.log(space + text)

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

    // todo: chalk.red(underline)
    console.log(space + underline)
    console.log('\n')
  }



  visitSelect(node: SelectStatement) {

    if (node.from) {
      if (node.from.joins) {
        node.from.joins.forEach(join => {
          if (!join.source.alias) {
            this.warning('joined sources should have an alias', join)
          }
        })
      }

      if (node.from.sources.length > 1 || node.from.joins) {
        // if there are joins OR multiple sources
        // require a two part name.
        node.columns.forEach(col => {
          walkExpr(col, (expr) => {
            if (expr.kind === SyntaxKind.identifier_expr) {
              const ident = <IdentifierExpression>expr

              if (ident.identifier.parts.length < 2) {
                this.warning('use a two-part name for queries involving more than one table', ident)
              }
            }
          })
        })
      }
    }
  }

  visitWhere(node: WhereClause) {
    // TODO: technically ANY expr that mutates a column value
    // will not be sargable, not just function calls
    // abc + 1 = 'foo1' would break it
    walkExpr(node.predicate, (e: Expr) => {
      if (e.kind === SyntaxKind.function_call_expr) {
        this.warning('function call will prevent search optimization', e)
      }
    })
  }

  visitColumnExpression(node: ColumnExpression) {
    if (node.style === 'alias_equals_expr') {
      this.warning('"alias = expression" syntax is deprecated, use "expression as alias" instead.', node)
    }
  }

  visitJoin(node: JoinedTable) {
    walkExpr(node.on, (e: Expr) => {
      // todo: are case exprs sargable?
      // simple vs searched? assume searched are more likely
      // to contain funky stuff.
      // todo: args could be constant
      if (e.kind === SyntaxKind.function_call_expr) {
        this.warning('function call will prevent search optimization', e)
      }
    })
  }

  visitBinaryExpression(node: BinaryExpression) {
    if (isNullLiteral(node.left) || isNullLiteral(node.right)) {
      this.warning('null literal used in comparison, use "is null" or "is not null" instead', node, node.op)
    } else {
      if (isComparison(node.op) && exprEquals(node.left, node.right)) {
        // todo: full on SAT solver, let's go crazy and prove some shit
        this.warning('value compared with itself, result will always be constant', node)
      }
    }

    // rule: null concat null, unsafe string concat

    // rule: expressions in a divisor slot which are non-literal
    // could cause divide by zero, that might be cool to test for
  }

  visitLike(like: LikeExpression) {
    const literal = like.pattern
    const pattern = <string>literal.value

    if (!hasLeadingPrefix(pattern)) {
      this.warning('patterns which do not begin with a prefix cannot benefit from indexes', like)
    }
    // no wildcard what's the point?
    // otherwildcard kinds?
  }

  visitKeyword(token: Token) {
    const val = <string>token.value

    for (let i = 0; i < val.length; i++) {
      // todo: reverse this for the crazy UPPER nerds
      if (isUpperChar(val.charCodeAt(i))) {
        this.info('identifiers should be lower case', token)
        break
      }
    }
  }
}
