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

import { printNodes } from '../src/visitors/print_visitor'
import { last } from '../src/utils'


describe('Parser', () => {

  const opt: any = { vendor: 'mssql' }

  it('returns an array of statements', () => {
    const parser = new Parser('use MyDb\n go\n', opt)
    const list = parser.parse()

    expect(list).to.be.an('array')
    expect(list.length).to.eq(2)
  })

  it('parses set statements', function () {
    const parser = new Parser('set @x = 1 + 2')
    const list = parser.parse()
    expect(list.length).to.eq(1)

    const statement = <SetStatement>list[0]

    expect(statement.name).to.eq('@x')
    const expr = <BinaryExpression>statement.expression

    expect(expr.left).to.include({ value: 1 })
    expect(expr.op.kind).to.eq(SyntaxKind.plus_token)
    expect(expr.right).to.include({ value: 2 })
  })

  it('parses declare statements', () => {
    const parser = new Parser('declare @x int = 0')
    const list = parser.parse()

    expect(list.length).to.eq(1)

    const statement = <DeclareStatement>list[0]
    const decls = <VariableDeclaration[]>statement.variables

    expect(decls.length).to.eq(1)

    const decl = decls[0]

    expect(decl.name).to.eq('@x')
    expect(decl.type.name).to.eq('int')
    expect(decl.expression).to.exist
  })

  it('parses multi-declares', () => {
    const parser = new Parser('declare @x int=0,\n     @y varchar(max)')
    const list = parser.parse()

    const statement = <DeclareStatement>list[0]
    const decls = statement.variables!

    expect(decls.length).to.eq(2)

    const decl = decls[1]

    expect(decl.name).to.eq('@y')
    expect(decl.type.name).to.eq('varchar')
    expect(decl.type.args).to.eq('max')
  })

  it('parses declare table', () => {
    const parser = new Parser('declare @x table ( id int not null, name char(10) null );')
    const list = parser.parse()
    const decl = <DeclareStatement>list[0]
    const table = <any>decl.table!

    expect(last(table.name)).to.eq('x')
    expect(table.body[0].nullability).to.eq('not-null')
  })

  it('parses select statements', () => {
    const parser = new Parser('select sum = 1 + 1')
    const list = parser.parse()

    const select = <SelectStatement>list[0]
    const col = <ColumnExpression>select.columns[0]

    expect((<Identifier>col.alias).parts[0]).to.eq('sum')

    const expr = <BinaryExpression>col.expression
    expect(expr.left.kind).to.eq(SyntaxKind.literal_expr)
    expect(expr.op.kind).to.eq(SyntaxKind.plus_token)
    expect(expr.right.kind).to.eq(SyntaxKind.literal_expr)
  })

  xit('debug: parse script and print ast', () => {
    const path = './test/mssql/kitchen_sink.sql'
    const file = readFileSync(path, 'utf8')
    const parser = new Parser(file, {
      debug: true,
      path: path
    })

    const tree = parser.parse()

    printNodes(tree)
  })
})
