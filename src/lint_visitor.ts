import { Parser, isLocal, isTemp } from './parser'

import chalk from 'chalk'

import { SyntaxNode, BinaryExpression, LiteralExpression, BinaryOperator, Expr, WhereClause, JoinedTable, IdentifierExpression, UnaryExpression, FunctionCallExpression, SearchedCaseExpression, SimpleCaseExpression, ColumnExpression, SelectStatement, LikeExpression, Identifier, FromClause, TableLikeDataSource } from './ast'
import { Visitor } from './abstract_visitor'
import { SyntaxKind } from './syntax'
import { Token } from './scanner'
import { Chars } from './chars'
import { isMisspelled } from 'spellchecker'

// todo: add some common sql-isms to the spellchecker
// dictionary where possible.

function isNullLiteral(node: SyntaxNode) {
  if (node.kind === SyntaxKind.literal_expr) {
    const literal = <LiteralExpression>node

    if (literal.value === 'null') {
      return true
    }
  }

  return false
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

function isDigit(charCode: number): boolean {
  return Chars.num_0 <= charCode && charCode <= Chars.num_9
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
  'PascalCase': /^(?:[A-Z][a-z]+)+$/,
  'camelCase': /^[a-z]+(?:[A-Z0-9][a-z0-9]+)+$/,
  'snake_case': /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
  'SCREAMING_SNAKE_CASE': /^[A-Z]+(?:_[A-Z])*$/
}

export class ExampleLintVisitor extends Visitor {
  private readonly severity: number
  public hasIssues = false

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

    this.hasIssues
  }

  visitDataSource(s: TableLikeDataSource) {
    if (s.expr.kind === SyntaxKind.identifier_expr) {
      const expr = <IdentifierExpression>s.expr
      const parts = expr.identifier.parts
      if (parts.length < 2) {
        // UNLESS it's a temp or local
        if (isLocal(parts[0])) { return }
        if (isTemp(parts[0])) { return }

        this.warning('named data sources should use at least a 2 part name', s)
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
        // let's go crazy and add some unreachable code detection
        this.error('value compared with itself, result will always be constant', node)
      }
    }

    // rule: null concat null, unsafe string concat (needs semantic model)

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
        this.info('keywords should be lower case', token)
        break
      }
    }
  }

  visitIdentifier(ident: Identifier) {
    if (this.severity !== Level.info) {
      return
    }

    const last = ident.parts[ident.parts.length - 1]

    const camelOrPascal = nameValidators.camelCase.test(last)
      || nameValidators.PascalCase.test(last)

    let start = 0

    if (isLocal(last) || isTemp(last)) {
      for (let i = 0; i < last.length; i++) {
        const c = last.charCodeAt(i)

        if (isLowerChar(c) || isUpperChar(c)) {
          start = i
          break
        }
      }
    }

    // todo: single letter identifier rule?

    const off = ident.parts.reduce((res, str) => {
      return res + str.length
    }, 0) - last.length

    // super next level, spellcheck
    if (camelOrPascal) {
      for (let i = start; i < last.length; i++) {
        const c = last.charCodeAt(i)
        // todo: skip over numbers... or something
        if (isUpperChar(c) || isDigit(c)) {
          const word = last.substring(start, i)
          if (isMisspelled(word)) {
            this.info('Check the spelling of ' + word, ident, { start: off + start, end: i })
          }
          start = i
        }
      }
    } else {
      const isSnake = nameValidators.snake_case.test(last)
      const isScreaming = nameValidators.SCREAMING_SNAKE_CASE.test(last)

      if (isSnake || isScreaming) {
        for (let i = start; i < last.length; i++) {
          const c = last.charCodeAt(i)
          if (c === Chars.underscore) {
            const word = last.substring(start, i)
            if (isMisspelled(word)) {
              this.info('Check the spelling of ' + word, ident, { start: off + start, end: i })
            }
            // could be some double-underscore nonsense
            start = ++i
          }
        }
      } else {
        this.info('What the hell kind of identifier is this?', ident)
      }
    }
  }
}
