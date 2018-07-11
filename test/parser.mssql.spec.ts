import { } from 'mocha'
import { expect } from 'chai'

import { Parser } from '../src/parser'
import { SyntaxKind } from '../src/syntax'
import {
  BinaryExpression,
  SetStatement,
  VariableDeclarationStatement,
  VariableDeclaration,
  SelectStatement,
  ColumnExpression,
  Expr,
  ValueExpression,
  BitwiseNotExpression,
  IdentifierExpression,
  LiteralExpression,
  ParenExpression,
  FunctionCallExpression,
  Identifier,
  SyntaxNode
} from '../src/ast'

describe('a statement parser', () => {

  it('returns an array of statements', () => {
    const parser = new Parser()
    const list = parser.parse('use MyDb\n go\n')

    expect(list).to.be.an('array')
    expect(list.length).to.equal(2)
  })

  it('parses set statements', function () {
    const parser = new Parser()
    const list = parser.parse('set @x = 1 + 2')
    expect(list.length).to.equal(1)

    const statement = <SetStatement>list[0]

    expect(statement.name).to.equal('@x')
    const expr = <BinaryExpression>statement.expression

    expect(expr.left).to.include({ value: 1 })
    expect(expr.op.kind).to.equal(SyntaxKind.plus_token)
    expect(expr.right).to.include({ value: 2 })
  })

  it('parses declare statements', () => {
    const parser = new Parser()
    const list = parser.parse('declare @x int = 0')

    expect(list.length).to.equal(1)

    const statement = <VariableDeclarationStatement>list[0]
    const decls = <VariableDeclaration[]>statement.declarations

    expect(decls.length).to.equal(1)

    const decl = decls[0]

    expect(decl.name).to.equal('@x')
    expect(decl.type.name).to.equal('int')
    expect(decl.expression).to.exist
  })

  it('parses multi-declares', () => {
    const parser = new Parser()
    const list = parser.parse('declare @x int=0,\n     @y varchar(max)')

    const statement = <VariableDeclarationStatement>list[0]
    const decls = <VariableDeclaration[]>statement.declarations

    expect(decls.length).to.equal(2)

    const decl = decls[1]

    expect(decl.name).to.equal('@y')
    expect(decl.type.name).to.equal('varchar')
    expect(decl.type.args).to.equal('max')
  })

  xit('parses declare table')
  xit('parses multiple variable decls')

  it('parses select statements', () => {
    const parser = new Parser()
    const list = parser.parse('select sum = 1 + 1')

    const select = <SelectStatement>list[0]
    const col = <ColumnExpression>select.columns[0]

    expect((<Identifier>col.alias).parts[0]).to.equal('sum')

    const expr = <BinaryExpression>col.expression
    expect(expr.left.kind).to.equal(SyntaxKind.literal_expr)
    expect(expr.op.kind).to.equal(SyntaxKind.plus_token)
    expect(expr.right.kind).to.equal(SyntaxKind.literal_expr)
  })

  const ops: any = {}
  ops[SyntaxKind.mul_token] = '*'
  ops[SyntaxKind.div_token] = '/'
  ops[SyntaxKind.plus_token] = '+'
  ops[SyntaxKind.minus_token] = '-'

  // todo: make this a visitor
  const printExpr = (expr: SyntaxNode) => {
    const write = (str: string) => {
      process.stdout.write(str)
    }

    switch (expr.kind) {
      case SyntaxKind.column_expr: {
        const col = <ColumnExpression>expr
        if (col.alias) {
          write(col.alias.parts.join('.') + ' ')
        } else {
          write('\'a ')
        }

        printExpr(col.expression)
        break
      }

      case SyntaxKind.select_statement: {
        const select = <SelectStatement>expr
        write('(select')

        write('\n  (cols')
        select.columns.forEach(c => {
          write('\n    ')
          printExpr(c)
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
        printExpr(binary.left)
        process.stdout.write(' ')
        printExpr(binary.right)
        write(')')
        break
      }

      case SyntaxKind.bitwise_not_expr: {
        const unary = <BitwiseNotExpression>expr
        write('(~ ')
        printExpr(unary.expr)
        write(')')
        break
      }

      case SyntaxKind.paren_expr: {
        // thought: useless paren exprs could be a linting rule
        const paren = <ParenExpression>expr
        printExpr(paren.expression)
        break
      }

      case SyntaxKind.function_call_expr: {
        const call = <FunctionCallExpression>expr
        write('(call ' + call.name.parts.join('.'))
        call.arguments.forEach(e => {
          write(' ')
          printExpr(e)
        })
        write(')')
        break
      }

      default: throw Error('unexpected kind: ' + SyntaxKind[expr.kind])
    }
  }

  it('debug: parses operator precedence', () => {
    // todo: doesn't support unary +/- properly yet.
    // todo: function call expressions are broken
    // todo: some.col wouldn't work either
    const parser = new Parser()
    const tree = parser.parse('select expr = some_func(1) + ~(2 * 3) / [some].col - 5, 1 + 1 as two')

    process.stdout.write('-- full JSON --\n')
    process.stdout.write(JSON.stringify(tree, undefined, ' '))
    process.stdout.write('\n-- pretty --\n')
    printExpr(tree[0])
    process.stdout.write('\n')
  })
})
