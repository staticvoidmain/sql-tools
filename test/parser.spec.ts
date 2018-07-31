import { } from 'mocha'
import { expect } from 'chai'

import { readFileSync } from 'fs'

import { Parser } from '../src/parser'
import { SyntaxKind } from '../src/syntax'
import {
  BinaryExpression,
  SetStatement,
  DeclareStatement,
  VariableDeclaration,
  SelectStatement,
  ColumnExpression,
  Identifier
} from '../src/ast'

import { printNodes } from '../src/print_visitor'

describe('Parser', () => {

  it('returns an array of statements', () => {
    const parser = new Parser('use MyDb\n go\n')
    const list = parser.parse()

    expect(list).to.be.an('array')
    expect(list.length).to.equal(2)
  })

  it('parses set statements', function () {
    const parser = new Parser('set @x = 1 + 2')
    const list = parser.parse()
    expect(list.length).to.equal(1)

    const statement = <SetStatement>list[0]

    expect(statement.name).to.equal('@x')
    const expr = <BinaryExpression>statement.expression

    expect(expr.left).to.include({ value: 1 })
    expect(expr.op.kind).to.equal(SyntaxKind.plus_token)
    expect(expr.right).to.include({ value: 2 })
  })

  it('parses declare statements', () => {
    const parser = new Parser('declare @x int = 0')
    const list = parser.parse()

    expect(list.length).to.equal(1)

    const statement = <DeclareStatement>list[0]
    const decls = <VariableDeclaration[]>statement.variables

    expect(decls.length).to.equal(1)

    const decl = decls[0]

    expect(decl.name).to.equal('@x')
    expect(decl.type.name).to.equal('int')
    expect(decl.expression).to.exist
  })

  it('parses multi-declares', () => {
    const parser = new Parser('declare @x int=0,\n     @y varchar(max)')
    const list = parser.parse()

    const statement = <DeclareStatement>list[0]
    const decls = <VariableDeclaration[]>statement.variables

    expect(decls.length).to.equal(2)

    const decl = decls[1]

    expect(decl.name).to.equal('@y')
    expect(decl.type.name).to.equal('varchar')
    expect(decl.type.args).to.equal('max')
  })

  xit('parses declare table')
  xit('parses multiple variable decls')

  it('parses select statements', () => {
    const parser = new Parser('select sum = 1 + 1')
    const list = parser.parse()

    const select = <SelectStatement>list[0]
    const col = <ColumnExpression>select.columns[0]

    expect((<Identifier>col.alias).parts[0]).to.equal('sum')

    const expr = <BinaryExpression>col.expression
    expect(expr.left.kind).to.equal(SyntaxKind.literal_expr)
    expect(expr.op.kind).to.equal(SyntaxKind.plus_token)
    expect(expr.right.kind).to.equal(SyntaxKind.literal_expr)
  })

  it('debug: parse script and print ast', () => {
    const path = './test/mssql/kitchen_sink.sql'
    const file = readFileSync(path, 'utf8')
    const parser = new Parser(file, {
      path: path
    })

    const tree = parser.parse()

    printNodes(tree)
  })
})
