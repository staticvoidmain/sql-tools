import { } from 'mocha'
import { expect } from 'chai'
import { Scope, local, INT, createGlobalScope, resolveAll, schema, table, column } from '../src/resolver'
import { Parser } from '../src/parser';
import { readFileSync } from 'fs';

describe('resolver', () => {

  function loadEnvironment(file: string) {
    const text = readFileSync(file, 'utf8')
    const json = JSON.parse(text)
    const scope = new Scope(undefined, 'root')

    for (const schemaName in json) {
      const s = schema(schemaName)
      const tables = json[schemaName]

      for (const tableName in tables) {
        const t = table(tableName)

        for (const col of tables[tableName].columns) {
          const entity = column(col.name)
          entity.nullable = col.nullable

          entity.parent = t
          t.columns.push(entity)
        }

        t.parent = s
        s.tables.push(t)

        // todo: this can be a flag at
        // some point, but for now we'll use the
        // standard default
        if (schemaName === 'dbo') {
          scope.define(t)
        }
      }

      scope.define(s)
    }
  }

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

  it('has a top-level global scope', () => {
    const global = createGlobalScope()
    const resolved = global.resolve('int')

    expect(resolved).to.equal(INT)
  })

  it('debug: full resolver test', () => {
    const source = `
     select foo.Bar
     from [dbo]."PrimaryTable" as foo
     where PrimaryTable.Bazz is not null
    `

    const parser = new Parser(source, {})
    const list = parser.parse()

    const env = loadEnvironment("./test/mssql/example.db.json")

    resolveAll(list)

  })
})
