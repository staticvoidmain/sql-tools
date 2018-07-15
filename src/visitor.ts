import { SyntaxKind } from './syntax'
import { Token } from './scanner'

import {
  BinaryExpression,
  SelectStatement,
  ColumnExpression,
  BitwiseNotExpression,
  IdentifierExpression,
  LiteralExpression,
  ParenExpression,
  FunctionCallExpression,
  SyntaxNode,
  UnaryMinusExpression,
  UnaryPlusExpression,
  SetStatement,
  DeclareStatement,
  VariableDeclaration,
  DataType,
  FromClause,
  DataSource,
  NamedSource,
  Identifier,
  WhereClause,
  IsNullTestExpression,
  TableDeclaration
} from './ast'

export class Visitor {
  visit(node: SyntaxNode) {
    switch (node.kind) {
      case SyntaxKind.select_statement:
        const select = <SelectStatement>node
        this.visitKeyword(select.keyword)
      // this.visit(

      default:
        throw 'Not implemented'
    }
  }

  visitKeyword(token: Token): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
}

function formatIdentifier(id: Identifier) {
  return id.parts.join('.')
}

// add all the binary ops
const ops: any = {}
ops[SyntaxKind.mul_token] = '*'
ops[SyntaxKind.div_token] = '/'
ops[SyntaxKind.plus_token] = '+'
ops[SyntaxKind.minus_token] = '-'
ops[SyntaxKind.and_keyword] = 'and'
ops[SyntaxKind.or_keyword] = 'or'
ops[SyntaxKind.in_keyword] = 'in'

ops[SyntaxKind.notEqual] = 'neq'
ops[SyntaxKind.equal] = 'eq'
ops[SyntaxKind.greaterThan] = 'gt'
ops[SyntaxKind.lessThan] = 'lt'
ops[SyntaxKind.greaterThanEqual] = 'gte'
ops[SyntaxKind.lessThanEqual] = 'lte'


// todo: more assignment ops
// this doesn't quite fit with the s-expr syntax,
// but whatever for now.
ops[SyntaxKind.plusEqualsAssignment] = 'plus-equals'
ops[SyntaxKind.minusEqualsAssignment] = 'minus-equals'
ops[SyntaxKind.divEqualsAssignment] = 'div-equals'
ops[SyntaxKind.mulEqualsAssignment] = 'mul-equals'
ops[SyntaxKind.modEqualsAssignment] = 'mod-equals'
ops[SyntaxKind.bitwiseXorAssignment] = 'xor-equals'
ops[SyntaxKind.bitwiseOrAssignment] = 'or-equals'
ops[SyntaxKind.bitwiseAndAssignment] = 'and-equals'

function spaces(n: number) {
  let s = ''
  while (n-- > 0)
    s += ' '
  return s
}

function isInline(kind: SyntaxKind) {
  return kind === SyntaxKind.identifier_expr || kind === SyntaxKind.literal_expr
}

export function printNode(node: SyntaxNode, level = 0) {

  const write = (str: string, newline?: boolean) => {
    if (newline) {
      const indent = spaces(level)
      process.stdout.write('\n' + indent)
    }

    process.stdout.write(str)
  }

  switch (node.kind) {
    // mostly noise, skip for now
    case SyntaxKind.set_option_statement:
    case SyntaxKind.use_database_statement:
    case SyntaxKind.go_statement: {
      break
    }

    case SyntaxKind.column_expr: {
      const col = <ColumnExpression>node
      if (col.alias) {
        write(col.alias.parts.join('.') + ' ')
      } else {
        write('a ')
      }
      level++
      printNode(col.expression, level)
      level--
      break
    }

    case SyntaxKind.select_statement: {
      const select = <SelectStatement>node
      write('(select', true)
      level++

      write('(cols', true)
      level++
      select.columns.forEach(c => {
        write('(col \'', true)
        printNode(c, level)
        write(')', true)
      })
      level--

      write(')', true)

      // write these on the same level as cols
      if (select.from) {
        printNode(select.from, level)
      }

      if (select.where) {
        printNode(select.where, level)
      }

      level--
      write(')', true)
      break
    }

    case SyntaxKind.from_clause: {
      // todo: recurse, there are other types
      const from = <FromClause>node
      const sources = <NamedSource[]>from.sources
      write('(from ' + formatIdentifier(sources[0].name) + ')', true)
      break
    }

    case SyntaxKind.where_clause: {
      const where = <WhereClause>node
      write('(where', true)
      printNode(where.predicate, level + 1)
      write(')', true)
      break
    }

    // not quite a binary op...
    case SyntaxKind.null_test_expr: {
      const test = <IsNullTestExpression>node
      if (test.not_null) {
        write('(is-not-null ', true)
      } else {
        write('(is-null ', true)
      }

      printNode(test.expr, level)
      write(')')
      break
    }

    case SyntaxKind.identifier_expr: {
      const ident = <IdentifierExpression>node
      write(formatIdentifier(ident.identifier))
      break
    }

    case SyntaxKind.literal_expr: {
      const literal = <LiteralExpression>node
      write('' + literal.value)
      break
    }

    case SyntaxKind.binary_expr: {
      // thought: expressions in a divisor slot which are non-literal
      // could cause divide by zero, that might be cool to test for
      const binary = <BinaryExpression>node
      const isComplex = binary.left.kind === SyntaxKind.binary_expr
        || binary.right.kind === SyntaxKind.binary_expr

      // this gets a little fiddly, but basically if we're going to indent
      // things in a uniform way, we need to ensure that things that normally
      // display inline are indented on a new line.
      if (isComplex) {

        write('(' + ops[binary.op.kind], true)
        level++

        const indent = spaces(level)

        if (binary.left.kind !== SyntaxKind.binary_expr) {
          write('\n' + indent)
        }

        printNode(binary.left, level)

        if (binary.right.kind !== SyntaxKind.binary_expr) {
          write('\n' + indent)
        }

        printNode(binary.right, level)
        level--
        write(')', true)
      }
      else {
        // else we can just inline the whole thing
        write('(' + ops[binary.op.kind] + ' ')
        printNode(binary.left, level)
        write(' ')
        printNode(binary.right, level)
      }
      break
    }

    case SyntaxKind.bitwise_not_expr: {
      const unary = <BitwiseNotExpression>node
      write('(~ ')
      printNode(unary.expr, level)
      write(')')
      break
    }

    case SyntaxKind.unary_minus_expr: {
      const unary = <UnaryMinusExpression>node
      write('(- ')
      printNode(unary.expr, level)
      write(')')
      break
    }

    case SyntaxKind.unary_plus_expr: {
      const unary = <UnaryPlusExpression>node
      write('(+ ')
      printNode(unary.expr, level)
      write(')')
      break
    }

    case SyntaxKind.paren_expr: {
      // thought: useless paren exprs could be a linting rule
      // but these will also contain select-exprs I guess...
      const paren = <ParenExpression>node
      printNode(paren.expression, level)
      break
    }

    case SyntaxKind.function_call_expr: {
      const call = <FunctionCallExpression>node
      write('(call ' + call.name.parts.join('.'))
      if (call.arguments) {
        call.arguments.forEach(e => {
          write(' ')
          printNode(e, level)
        })
      }
      write(')')
      break
    }

    case SyntaxKind.set_statement: {
      const set = <SetStatement>node
      const op = ops[set.op.kind]

      write(`(${op} ${set.name} `, true)
      printNode(set.expression, level)
      write(')')
      break
    }

    case SyntaxKind.data_type: {
      const type = <DataType>node
      write(type.name)
      if (type.args) {
        write('[')
        if (type.args === 'max') {
          write(type.args)
        } else {
          write(type.args.join(', '))
        }
        write(']')
      }
      break
    }

    case SyntaxKind.scalar_variable_decl: {
      const scalar = <VariableDeclaration>node
      write('(scalar ' + scalar.name + ' ', true)
      printNode(scalar.type, level)

      if (scalar.expression) {
        write(' ')
        printNode(scalar.expression, level)
      }
      write(')')
      break
    }

    case SyntaxKind.table_variable_decl: {
      const table = <TableDeclaration>node
      write('(table ' + table.name + ' ', true)
      level++
      table.body.forEach((i) => {
        printNode(i, level)
      })
      level--
      write(')', true)
      break
    }

    case SyntaxKind.declare_statement: {
      const declare = <DeclareStatement>node
      write('(declare', true)

      if (!declare.table) {
        const vars = <VariableDeclaration[]>declare.variables
        if (vars) {
          level++
          vars.forEach((n) => printNode(n, level))
          level--
        }
      } else {
        // not supported
      }

      write(')', true)
      break
    }

    default: throw Error('unsupported node: ' + SyntaxKind[node.kind])
  }
}
