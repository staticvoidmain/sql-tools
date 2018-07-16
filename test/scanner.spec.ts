import { } from 'mocha'
import { expect } from 'chai'

import { Scanner, Token } from '../src/scanner'
import { SyntaxKind } from '../src/syntax'
import { readFileSync } from 'fs'

//#region helpers

function scanAll(scanner: Scanner, whitespace?: boolean) {
  const tokens = []

  while (true) {
    const token = scanner.scan()

    if (token.kind === SyntaxKind.EOF) {
      break
    }

    if (token.kind !== SyntaxKind.whitespace || whitespace) {
      tokens.push(token)
    }
  }

  return tokens
}

interface TokenAssert {
  kind: SyntaxKind
  value?: any
}

function tokenToString(token: Token | TokenAssert) {
  const val = token.value ? ' = '  + token.value : ''

  return SyntaxKind[token.kind] + val
}

function assertTokens(actual: Token[], expected: TokenAssert[]) {
  const actualTokens = actual.map(tokenToString).join('\n')

  expect(actual.length).to.equal(expected.length, `Incorrect token count: \n ${actualTokens}`)

  for (let index = 0; index < actual.length; index++) {
    const ex = expected[index]
    const token = actual[index]
    const match = ex.kind === token.kind
      && (!ex.value || ex.value === token.value)

    expect(match).to.equal(true,
      `[${index}] Expected ${tokenToString(ex)} got ${tokenToString(token)}`)
  }
}

function assertTokenKinds(actual: Token[], expected: SyntaxKind[]) {
  const actualTokens = actual.map(tokenToString).join('\n')
  expect(actual.length).to.equal(expected.length, `Incorrect token count: \n ${actualTokens}`)

  for (let index = 0; index < actual.length; index++) {
    expect(actual[index].kind).to.equal(expected[index],
      `[${index}] Expected ${SyntaxKind[expected[index]]} got ${SyntaxKind[actual[index].kind]}`)
  }
}
//#endregion

describe('Scanner', function () {

  it('scans whitespace as a single token', function () {
    const scanner = new Scanner('   \t \t  \r\n\t\r\n  \n   ', {})
    const token = scanner.scan()

    expect(token.kind).to.equal(SyntaxKind.whitespace)
  })

  it('captures line numbers', function () {
    const scanner = new Scanner('   \t \t  \r\n\t\r\n  \n   ', { skipTrivia: true })
    const space = scanner.scan()
    const eof = scanner.scan()

    expect(space.kind).to.equal(SyntaxKind.whitespace)
    expect(eof.kind).to.equal(SyntaxKind.EOF)
    expect(scanner.lineOf(eof)).to.equal(3)
  })

  it('scans integers', function () {
    const scanner = new Scanner('012345678', {})
    const token = scanner.scan()

    expect(token.kind).to.equal(SyntaxKind.numeric_literal)
    expect(token.value).to.equal(12345678)
  })

  it('scans floats', function () {
    const scanner = new Scanner('123.456')
    const token = scanner.scan()

    expect(token.kind).to.equal(SyntaxKind.numeric_literal)
    expect(token.value).to.equal(123.456)
  })

  it('scans numbers without screwing up the next token', function () {
    const scanner = new Scanner('1.2*3')
    const tokens = scanAll(scanner)

    assertTokens(tokens, [
      { kind: SyntaxKind.numeric_literal,  value: 1.2 },
      { kind: SyntaxKind.mul_token },
      { kind: SyntaxKind.numeric_literal, value: 3 },
    ])
  })

  it ('scans miscellaneous terminals',  function() {
    const scanner = new Scanner(', . ; ( ) ~')
    const tokens = scanAll(scanner)

    assertTokenKinds(tokens, [
      SyntaxKind.comma_token,
      SyntaxKind.dot_token,
      SyntaxKind.semicolon_token,
      SyntaxKind.openParen,
      SyntaxKind.closeParen,
      SyntaxKind.bitwise_not_token
    ])
  })

  it('scans simple strings', function () {
    const scanner = new Scanner("'hello world!'", {})
    const token = scanner.scan()

    expect(token.kind).to.equal(SyntaxKind.string_literal)
    expect(token.value).to.equal('hello world!')
  })

  it('scans empty strings', function () {
    const scanner = new Scanner("''", {})
    const token = scanner.scan()

    expect(token.kind).to.equal(SyntaxKind.string_literal)
    expect(token.value).to.equal('')
  })

  it('handles escape sequences in strings', function () {
    const scanner = new Scanner("'hello world, I''m Ross'", {})
    const token = scanner.scan()

    expect(token.kind).to.equal(SyntaxKind.string_literal)
    expect(token.value).to.equal("hello world, I''m Ross")
  })

  it('handles unicode strings', function () {
    const scanner = new Scanner("n'hello world, I''m Ross'", {})
    const token = scanner.scan()

    expect(token.kind).to.equal(SyntaxKind.string_literal)
    expect(token.value).to.equal("hello world, I''m Ross")
  })

  it('tokenizes keywords regardless of case', function () {
    const scanner = new Scanner('set DECLARE Update InSerT current_date', {})
    const tokens = scanAll(scanner)

    assertTokenKinds(tokens, [
      SyntaxKind.set_keyword,
      SyntaxKind.declare_keyword,
      SyntaxKind.update_keyword,
      SyntaxKind.insert_keyword,
      SyntaxKind.current_date_keyword
    ])
  })

  it('handles binary operators', function () {
    const scanner = new Scanner('+ - * / > < >= <= !> !< <> !=', {})
    const tokens = scanAll(scanner)
    assertTokenKinds(tokens, [
      SyntaxKind.plus_token,
      SyntaxKind.minus_token,
      SyntaxKind.mul_token,
      SyntaxKind.div_token,
      SyntaxKind.greaterThan,
      SyntaxKind.lessThan,
      SyntaxKind.greaterThanEqual,
      SyntaxKind.lessThanEqual,
      SyntaxKind.notGreaterThan,
      SyntaxKind.notLessThan,
      SyntaxKind.ltGt,
      SyntaxKind.notEqual,
    ])
  })

  it('handles assignment operators', function () {
    const scanner = new Scanner('+= -= *= /= |= &= ^=', {})
    const tokens = scanAll(scanner)
    assertTokenKinds(tokens, [
      SyntaxKind.plusEqualsAssignment,
      SyntaxKind.minusEqualsAssignment,
      SyntaxKind.mulEqualsAssignment,
      SyntaxKind.divEqualsAssignment,
      SyntaxKind.bitwiseOrAssignment,
      SyntaxKind.bitwiseAndAssignment,
      SyntaxKind.bitwiseXorAssignment,
    ])
  })

  it('scans block comments', function () {
    const scanner = new Scanner('/* comment\n 1234 \r\n */asdf')
    const tokens = scanAll(scanner)
    assertTokenKinds(tokens, [
      SyntaxKind.comment_block,
      SyntaxKind.identifier
    ])
  })

  it('scans inline comments', function () {
    const scanner = new Scanner('-- comment\n1234', {})

    expect(scanner.scan().kind).to.equal(SyntaxKind.comment_inline)
    expect(scanner.scan().kind).to.equal(SyntaxKind.numeric_literal)
  })

  it('scans simple identifiers', function () {
    const ident = 'foo _bar1 @baz #tbl'
    const scanner = new Scanner(ident)
    const tokens = scanAll(scanner)

    assertTokens(tokens, [
      { kind: SyntaxKind.identifier, value: 'foo' },
      { kind: SyntaxKind.identifier, value: '_bar1' },
      { kind: SyntaxKind.identifier, value: '@baz' },
      { kind: SyntaxKind.identifier, value: '#tbl' },
    ])
  })

  it ('scans regular identifiers with dots', function() {
    // maybe some kind of flavor: mssql flag?
    const scanner = new Scanner('@sometable.some_col')
    const tokens = scanAll(scanner, false)

    assertTokens(tokens, [
      { kind: SyntaxKind.identifier, value: '@sometable' },
      { kind: SyntaxKind.dot_token },
      { kind: SyntaxKind.identifier, value: 'some_col' }
    ])
  })

  it('scans complex identifiers', function () {
    const scanner = new Scanner('[foo].b@r."$b_z"')
    const tokens = scanAll(scanner)

    assertTokens(tokens, [
      { kind: SyntaxKind.identifier, value: '[foo]' },
      { kind: SyntaxKind.dot_token },
      { kind: SyntaxKind.identifier, value: 'b@r' },
      { kind: SyntaxKind.dot_token },
      { kind: SyntaxKind.identifier, value: '"$b_z"' },
    ])
  })

  it('scans insane identifiers', function () {
    // this is ACTUALLY a temp table...named #"sometable"
    const scanner = new Scanner('"#""sometable"""    ')
    const token = scanner.scan()

    expect(token.kind).to.equal(SyntaxKind.identifier)

    // not sure how i like the handling of quoted identifiers...
    expect(token.value).to.equal('"#""sometable"""')
  })

  xit('todo: should stop after the last unescaped double-quote')

  it ('debug: show token stream', function() {
    const file = readFileSync('./test/mssql/basic_select.sql', 'utf8')
    const scanner = new Scanner(file)
    const tokens = scanAll(scanner, false)

    console.log(tokens.map(tokenToString).join('\r\n'))
  })
})
