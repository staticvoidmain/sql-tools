import { } from 'mocha'
import { expect } from 'chai'

import { Parser } from '../src/parser'
import { SyntaxKind } from '../src/syntax'

xdescribe('a statement parser', function () {
  const parser = new Parser()

  xit('parses simple decl', () => {
    const tree = parser.parse('declare @x int = 0', { name: 'test.sql' })

    // todo: node visitor / printer
    console.log(tree)
  })

  xit('parses operator precedence correctly', () => {
    const tree = parser.parse('declare @x int = ~1 + 2 * 3 / -4', { name: 'test.sql' })

    // todo: node visitor / printer
    console.log(tree)
  })

  xit('returns an array of statements', function () {
    const tree = parser.parse('use MyDb\n go\nselect 1 + 1', { name: 'test.sql' })

    expect(tree).to.be.an('array')
    expect(tree.length).to.equal(3)
  })
})
