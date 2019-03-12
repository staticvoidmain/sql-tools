import { Parser, isLocal, isTemp } from '../parser'

import chalk from 'chalk'

import { SyntaxNode, BinaryExpression, LiteralExpression, BinaryOperator, Expr, WhereClause, JoinedTable, IdentifierExpression, UnaryExpression, FunctionCallExpression, SearchedCaseExpression, SimpleCaseExpression, ColumnExpression, SelectStatement, LikeExpression, Identifier, FromClause, TableLikeDataSource, CreateTableAsSelectStatement, CreateTableStatement, DropStatement } from '../ast'
import { Visitor } from './abstract_visitor'
import { SyntaxKind } from '../syntax'
import { Token } from '../scanner'
import { isLetter, isUpper } from '../chars'
import { isMisspelled, add as addWord } from 'spellchecker'
import { last } from '../utils'

// todo: add some common sql-isms to the spellchecker
// dictionary where possible.
addWord('cte')
addWord('ctas')
addWord('crtas')

function isNullLiteral(node: SyntaxNode) {
  if (node.kind === SyntaxKind.literal_expr) {
    const literal = <LiteralExpression>node

    if (literal.value === 'null') {
      return true
    }
  }

  return false
}

function getIdentifierText(part: string) {
  let start = 0
  let end = part.length - 1

  for (; start < part.length; start++) {
    if (isLetter(part.charCodeAt(start))) {
      break
    }
  }

  for (; end > start; end--) {
    if (isLetter(part.charCodeAt(end))) {
      break
    }
  }

  if (start > 0 || end < part.length - 1) {
    return part.substring(start, end)
  }

  return part
}

// support is null and is not null?
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

// should start with something other than %, _, or [
function hasLeadingPrefix(pattern: string) {
  return /^[^_\[%]+/.test(pattern)
}

/* internal */
type Node =
  | SyntaxNode
  | Token

interface Span {
  start: number
  end: number
}

export enum Level {
  info,
  warning,
  error
}

const severityMap: any = {
  'info': chalk.cyan('info'),
  'warning': chalk.yellow('warning'),
  'error': chalk.red('error')
}

const nameValidators = {
  // allows runs of digits to be slapped in there
  'camelCase': /^[a-z]+(?:[0-9]*[A-Z][a-z0-9]+)*\b$/,
  'PascalCase': /^[A-Z](?:[A-Z]+[0-9]*[a-z]*)*$/,
  'snake_case': /^[a-z]+(?:_[a-z0-9]+)*$/,
  'SCREAMING_SNAKE_CASE': /^[A-Z]+(?:_[A-Z0-9])*$/
}

export class ExampleLintVisitor extends Visitor {
  public hasIssues = false

  private readonly severity: number
  private readonly tempTables: Array<string> = []

  constructor(private parser: Parser, sev: string) {
    super()
    this.severity = (<any>Level)[sev]
  }

  private error(message: string, node: Node, underlineNode: Span = node, category = ' ') {
    if (this.severity <= Level.error) {
      this.emit(message, node, underlineNode, 'error', category)
    }
  }

  private warning(message: string, node: Node, underlineNode: Span = node, category = ' ') {
    if (this.severity <= Level.warning) {
      this.emit(message, node, underlineNode, 'warning', category)
    }
  }

  private info(message: string, node: Node, underlineNode: Span = node, category = ' ') {
    if (this.severity === Level.info) {
      this.emit(message, node, underlineNode, 'info', category)
    }
  }

  /**
   * display a warning for the current node, optionally underlining a child
   * node to provide more clarity
   */
  private emit(message: string, node: Node, underlineNode: Span = node, severity = 'warning', category = ' ') {
    let space = '    '
    const [file, line, col, text] = this.parser.getInfo(node)
    const sev = severityMap[severity]
    console.log(`${file}:${line + 1}:${col + 1} - ${sev} -${category}${message}\n`)
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

    console.log(space + chalk.red(underline))
    console.log('\n')
  }

  visitDataSource(s: TableLikeDataSource) {
    if (s.expr.kind === SyntaxKind.identifier_expr) {
      const expr = <IdentifierExpression>s.expr
      const parts = expr.identifier.parts
      if (parts.length < 2) {
        // UNLESS it's a temp or local
        if (isLocal(parts[0])) { return }
        if (isTemp(expr.identifier)) { return }

        // semantic would make this better...
        // the real rule is tables should be schema qualified
        this.warning('named data sources should use at least a 2 part name', s)
      }

      if (isTemp(expr.identifier)) {
        // if it's a SHARED temp, flag it as a smell
      }
    }
  }

  visitFrom(from: FromClause) {
    if (from.joins) {
      from.joins.forEach(join => {
        if (!join.source.alias) {
          this.warning('joined sources should have an alias', join)
        }
      })
    }
  }

  visitSelect(node: SelectStatement) {

    const multipleSources = node.from
      && (node.from.sources.length > 1 || node.from.joins)

    // if there are joins OR multiple sources
    // require a two part name.
    node.columns.forEach(col => {

      if (col.expression.kind !== SyntaxKind.identifier_expr) {
        if (!col.alias) {
          this.warning('complex expressions require aliases', col)
        }
      }

      if (multipleSources) {
        walkExpr(col, (expr) => {
          if (expr.kind === SyntaxKind.identifier_expr) {
            const ident = <IdentifierExpression>expr
            const parts = ident.identifier.parts

            if (parts.length < 2) {
              // semantic would make this better...
              // the real rule is tables should be schema qualified
              this.warning('use a two-part name for queries involving more than one table', ident)
            }
          }
        })
      }
    })
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
      this.info('"alias = expression" syntax is deprecated, use "expression as alias" instead.', node)
    }
  }

  visitJoin(node: JoinedTable) {
    // todo: if we're joining on nonsense [requires-semantic]

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
      this.error('null literal used in comparison, use "is null" or "is not null" instead', node, node.op)
    } else {
      if (isComparison(node.op) && exprEquals(node.left, node.right)) {

        // todo: people do like their 1=1 nonsense, give that a pass.
        // todo: link to a full on SAT solver
        // for some unreachable code detection
        this.error('value compared with itself, result will always be constant', node)
      }
    }

    // rule: null concat null, unsafe string concat (needs semantic model)
    // rule: expressions in a divisor slot which are non-literal
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
      if (isUpper(val.charCodeAt(i))) {
        this.info('keywords should be lower case', token)
        break
      }
    }
  }

  visitIdentifier(ident: Identifier) {
    if (this.severity !== Level.info) {
      return
    }

    const text = getIdentifierText(ident.parts[ident.parts.length - 1])

    if (text.length <= 4) {
      // we'll grandfather in some
      // short names for now until we have
      // a resolver, then we can allow aliases
      // to be misspelled, but nothing else
      return
    }

    const words = /(?:[0-9]+|(?<=[a-z])(?=[A-Z]))/g

    // this works for both cases.
    text.split('_').forEach(segment => {
      segment.split(words).forEach(word => {
        if (word.length > 1) {
          if (isMisspelled(word)) {
            this.info('Check the spelling of ' + word, ident)
          }
        }
      })
    })
  }

  visitCreateTable(table: CreateTableStatement) {
    if (isTemp(table.name)) {
      // does schema qualifying a temp table do anything?
      // seems like it's redundant.
      if (table.name.parts.length > 1) {
        this.info('overqualified temp-table name', table.name, undefined, 'code-smell')
      }

      this.tempTables.push(last(table.name.parts))
    }
  }

  visitDrop(drop: DropStatement) {
    if (drop.objectType.kind === SyntaxKind.table_keyword) {
      if (isTemp(drop.target)) {
        const i = this.tempTables.indexOf(last(drop.target.parts))

        if (i === -1) {
          this.info('Dropping a temp table you didn\'t create in this file.', drop, undefined, 'code-smell')
        } else {
          this.tempTables.splice(i, 1)
        }
      }
    }
  }

  visitEndOfFile() {
    if (this.tempTables.length > 0) {
      // if there are undropped temp tables, let's flag those
      // it might be someone trying to do IPC with them...
      const tables = this.tempTables.join(', ')
      const message = 'One or more #temp_tables exist after end of script: ' + tables

      this.info(message,
        new Token(SyntaxKind.EOF, 0, 0), undefined, 'code-smell')
    }
  }
}
