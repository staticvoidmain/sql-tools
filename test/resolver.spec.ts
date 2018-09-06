import { } from 'mocha'
import { expect } from 'chai'
import { Scope, local, resolveAll, schema, table, column, database, symbol, loadEnvironment } from '../src/resolver'
import { Parser } from '../src/parser'
import { readFileSync } from 'fs'
import { IdentifierExpression } from '../src/ast'

describe('resolver', () => {

  it('ignores case', () => {
    const test = new Scope(undefined, 'test')
    const defined = test.define(local('@foo'))
    const resolved = test.resolve('@FOO')

    expect(defined).to.equal(resolved)
  })

  it('resolves up the scope chain', () => {
    const test = new Scope(undefined, 'test')
    const defined = test.define(local('@asdf'))
    const child = test.createScope('child-scope')
    const resolved = child.resolve('@asdf')

    expect(defined).to.equal(resolved)
  })

  it('debug: full resolver test', () => {
    const source = `
     select cust.id
     from [dbo]."Customers" as cust
     where cust.birthday < dateadd(year, -18, getdate())
    `

    const parser = new Parser(source, {})
    const list = parser.parse()

    const env = loadEnvironment('./test/mssql/example.db.json')
    const db = env.findChild('example')

    resolveAll(list, db!)

    const select = <any>list[0]
    const expr = <IdentifierExpression>select.where!.predicate.left
    expect(expr.identifier.entity.name).to.equal('birthday')
    expect(expr.identifier.entity.parent.name).to.equal('Customers')

    // I want to test that birthday got resolved.
  })
})
