import { } from 'mocha'
import { expect } from 'chai'
import { Scope, local, createGlobalScope, resolveAll, schema, table, column } from '../src/resolver'
import { Parser } from '../src/parser'
import { readFileSync } from 'fs'

describe('resolver', () => {


  /*
  load an environment data structure from some external database schema dump to json


  <root>
    <database>
    scope::
      <dbo>
        <table>

      <table>
  */

  function loadEnvironment(file: string) {
    const text = readFileSync(file, 'utf8')
    const json = JSON.parse(text)
    const scope = new Scope(undefined, 'root')

    for (const dbName in json.databases) {
      const db  = scope.createScope(dbName)

      loadDatabase(db, json.databases[dbName])
    }

    return scope
  }

  function loadDatabase(scope: Scope, db: any) {

    for (const schemaName in db.schemas) {
      const s = schema(schemaName)
      const tables = db[schemaName].tables

      for (const tableName in tables) {
        const t = table(tableName)
        const columns = tables[tableName].columns
        for (const columnName in columns) {
          const entity = column(columnName)
          const col = columns[columnName]
          entity.nullable = col.nullable
          entity.type = col.type
          entity.parent = t
          t.children!.add(columnName, entity)
        }

        t.parent = s
        s.children!.add(tableName, t)

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

  it('debug: full resolver test', () => {
    const source = `
     select foo.Bar
     from [dbo]."PrimaryTable" as foo
     where PrimaryTable.Bazz is not null
    `

    const parser = new Parser(source, {})
    const list = parser.parse()

    const env = loadEnvironment('./test/mssql/example.db.json')

    resolveAll(list, env)
  })
})
