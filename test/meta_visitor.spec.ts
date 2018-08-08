import 'mocha'
import { MetadataVisitor } from '../src/visitors/meta_visitor'
import { Parser } from '../src/parser'
import { readFileSync } from 'fs'
import { getFlagsForEdition } from '../src/features'

describe('MetadataVisitor', () => {

  it('debug: captures CRUD', () => {
    const visitor = new MetadataVisitor()
    const path = './test/mssql/kitchen_sink.sql'
    const text = readFileSync(path, 'utf8')
    const parser = new Parser(text, {
      debug: true,
      skipTrivia: true,
      path: path,
      features: getFlagsForEdition('sql-server', '2016'), // hack: fix this later
    })

    visitor.visit_each(parser.parse())

    const meta = visitor.getMetadata()

    console.log(JSON.stringify(meta, undefined, ' '))
  })
})
