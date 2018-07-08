import { } from 'mocha'
import { expect } from 'chai'

import { Parser } from '../src/parser'
import { SyntaxKind } from '../src/syntax'
import {
  BinaryExpression,
  SetStatement,
  VariableDeclarationStatement,
  VariableDeclaration
} from '../src/ast'

describe('a statement parser', function () {

  it('returns an array of statements', function () {
    const parser = new Parser()
    const list = parser.parse('use MyDb\n go\n')

    expect(list).to.be.an('array')
    expect(list.length).to.equal(2)
  })

  it('parses set statements', function() {
    const parser = new Parser()
    const list = parser.parse('set @x = 1 + 2')
    expect(list.length).to.equal(1)

    const statement = <SetStatement>list[0]

    expect(statement.name).to.equal('@x')
    const expr = <BinaryExpression>statement.expression

    expect(expr.left).to.include({value: 1})
    expect(expr.op.kind).to.equal(SyntaxKind.plusToken)
    expect(expr.right).to.include({value: 2})
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
    expect(decl.type).to.equal('int')
    expect(decl.expression).to.exist
    // todo:
  })

  xit('parses declare table')
  xit('parses multiple variable decls')

  xit('parses weird precedence correctly', () => {
    const parser = new Parser()
    const tree = parser.parse('declare @x int = 1 + ~2 * 3 / -4')

    // todo: node visitor / printer
    console.log(tree)
  })
})
