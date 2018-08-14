import { } from 'mocha'
import { expect } from 'chai'

import { bufferToString } from '../src/utils'
import { readFileSync } from 'fs'
import { Parser } from '../src/parser'
import { getFlagsForEdition } from '../src/features'
import { ExampleLintVisitor } from '../src/visitors/lint_visitor'

// ripped from index.ts
function lint(path: string) {

  const buff = readFileSync(path)
  const text = bufferToString(buff)

  const parser = new Parser(text, {
    debug: true,
    skipTrivia: true,
    path: path,
    features: getFlagsForEdition('sql-server', '2016'), // hack: fix this later
  })

  const tree = parser.parse()
  const visitor = new ExampleLintVisitor(parser, 'info')

  for (const node of tree) {
    visitor.visit(node)
  }

  for (const key of parser.getKeywords()) {
    visitor.visitKeyword(key)
  }
}

describe('lint_visitor', function () {
  xit('debug: lint the file', function () {
    lint('./test/mssql/select_with_join.sql')
  })
})
