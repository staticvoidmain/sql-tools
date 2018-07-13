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
  DataType
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

const ops: any = {}
ops[SyntaxKind.mul_token] = '*'
ops[SyntaxKind.div_token] = '/'
ops[SyntaxKind.plus_token] = '+'
ops[SyntaxKind.minus_token] = '-'
// this doesn't quite fit with the s-expr syntax,
// but whatever for now.
ops[SyntaxKind.plusEqualsAssignment] = '+='
ops[SyntaxKind.minusEqualsAssignment] = '-='

export function printNode (expr: SyntaxNode) {
  const write = (str: string) => {
    process.stdout.write(str)
  }

  switch (expr.kind) {
    // just noise
    case SyntaxKind.use_database_statement:
    case SyntaxKind.goto_statement: {
      break
    }

    case SyntaxKind.column_expr: {
      const col = <ColumnExpression>expr
      if (col.alias) {
        write(col.alias.parts.join('.') + ' ')
      } else {
        write('a ')
      }

      printNode(col.expression)
      break
    }

    case SyntaxKind.select_statement: {
      const select = <SelectStatement>expr
      write('(select')

      write('\n  (cols')
      select.columns.forEach(c => {
        write('\n    (col \'')
        printNode(c)
        write(' )')
      })
      write('\n  )')

      write('\n)')
      break
    }

    case SyntaxKind.identifier_expr: {
      const ident = <IdentifierExpression>expr
      write(ident.identifier.parts.join('.'))
      break
    }

    case SyntaxKind.literal_expr: {
      const literal = <LiteralExpression>expr
      write('' + literal.value)
      break
    }

    case SyntaxKind.binary_expr: {
      // thought: expressions in a divisor slot which are non-literal
      // could cause divide by zero, that might be cool to test for
      const binary = <BinaryExpression>expr
      write('(' + ops[binary.op.kind] + ' ')
      printNode(binary.left)
      process.stdout.write(' ')
      printNode(binary.right)
      write(')')
      break
    }

    case SyntaxKind.bitwise_not_expr: {
      const unary = <BitwiseNotExpression>expr
      write('(~ ')
      printNode(unary.expr)
      write(')')
      break
    }

    case SyntaxKind.unary_minus_expr: {
      const unary = <UnaryMinusExpression>expr
      write('(- ')
      printNode(unary.expr)
      write(')')
      break
    }

    case SyntaxKind.unary_plus_expr: {
      const unary = <UnaryPlusExpression>expr
      write('(+ ')
      printNode(unary.expr)
      write(')')
      break
    }

    case SyntaxKind.paren_expr: {
      // thought: useless paren exprs could be a linting rule
      const paren = <ParenExpression>expr
      printNode(paren.expression)
      break
    }

    case SyntaxKind.function_call_expr: {
      const call = <FunctionCallExpression>expr
      write('(call ' + call.name.parts.join('.'))
      if (call.arguments) {
        call.arguments.forEach(e => {
          write(' ')
          printNode(e)
        })
      }
      write(')')
      break
    }

    case SyntaxKind.set_statement: {
      const set = <SetStatement>expr

      write('(set \'' + set.name)
      write(ops[set.op.kind] + ' ')
      printNode(set.expression)
      write(')')
      break
    }

    case SyntaxKind.data_type: {
      const type = <DataType>expr
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
      const scalar = <VariableDeclaration>expr
      write('\n  (scalar ' + scalar.name + ' ')
      printNode(scalar.type)

      if (scalar.expression) {
        write(' ')
        printNode(scalar.expression)
      }
      write(')')
      break
    }

    case SyntaxKind.declare_statement: {
      const declare = <DeclareStatement>expr
      write('\n(declare')

      if (!declare.table) {
        const vars = <VariableDeclaration[]>declare.variables
        if (vars) {
          vars.forEach(printNode)
        }
      } else {
        // not supported
      }

      write('\n)')
      break
    }

    default: throw Error('unexpected kind: ' + SyntaxKind[expr.kind])
  }
}
