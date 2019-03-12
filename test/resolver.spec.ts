import { } from 'mocha'
import { expect } from 'chai'
import { Scope, local, resolveAll, loadEnvironment } from '../src/resolver'
import { Parser } from '../src/parser'
import { IdentifierExpression, SelectStatement, BinaryExpression } from '../src/ast'
import { notDeepEqual } from 'assert';


describe('resolver', () => {

  const env = loadEnvironment('./test/mssql/example.db.json')
  const db = env.findChild('example')!

  it('resolves up the scope chain', () => {
    const test = new Scope(undefined, 'test')
    const defined = test.define(local('@asdf'))
    const child = test.createScope('child-scope')
    const resolved = child.resolve('@asdf')

    expect(defined).to.equal(resolved)
  })

  it ('warns on amiguous symbols', () => {
    // todo
  })

  it('resolves through aliases', () => {
    const source = `
     select cust.id
     from [dbo]."Customers" as cust
     where cust.birthday < dateadd(year, -18, getdate())
    `

    const parser = new Parser(source, { vendor: 'mssql' })
    const list = parser.parse()

    resolveAll(list, db)

    const select = <SelectStatement>list[0]
    const column = <IdentifierExpression>select.columns[0].expression

    expect(column.identifier.entity).to.exist

    const expr = <BinaryExpression>select.where!.predicate
    const entity = (<IdentifierExpression>expr.left).identifier.entity
    expect(entity.name).to.equal('birthday')
    expect(entity.parent.name).to.equal('customers')

    expect(entity.parent).to.equal(column.identifier.entity.parent)
  })

  it ('discards scope on GO-stmt', () => {
    const source = `
     declare @x int = 1;
     go
     set @x = 10;
    `

    const parser = new Parser(source, { vendor: 'mssql' })
    const list = parser.parse()

    // should get an undeclared identifier
    expect(() => { resolveAll(list, db) }).to.throw()
  })

  it('resolves with nested select', () => {
    const source = `
     select cust.id
     from (
       select id, birthday
       from [dbo]."Customers"
     ) as cust
     where cust.birthday < dateadd(year, -18, getdate())
    `
    const parser = new Parser(source, { vendor: 'mssql' })
    const list = parser.parse()

    resolveAll(list, db)

    // todo: no asserts... fixme
  })
})
