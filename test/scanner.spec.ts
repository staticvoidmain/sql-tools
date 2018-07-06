import { } from 'mocha'
import { expect } from 'chai'

import { Scanner, Token } from '../src/scanner'
import { SyntaxKind } from '../src/syntax'
import { readFileSync } from 'fs'

function scanAll(scanner: Scanner) {
  const tokens = []

  while (true) {
    const token = scanner.scan()

    if (token.kind === SyntaxKind.EOF) {
      break
    }

    if (token.kind !== SyntaxKind.whitespace) {
      tokens.push(token)
    }
  }

  return tokens
}

interface TokenAssert {
  kind: SyntaxKind
  value: any
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
      && ex.value === token.value

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

describe('Scanner', function () {

  it('scans whitespace as a single token', function () {
    const scanner = new Scanner('   \t \t  \r\n\t\r\n  \n   ', {})
    const token = scanner.scan()

    expect(token.kind).to.equal(SyntaxKind.whitespace)
  })

  it('captures line numbers lazily', function () {
    const scanner = new Scanner('   \t \t  \r\n\t\r\n  \n   ', { skipTrivia: true })
    const space = scanner.scan()
    const eof = scanner.scan()

    expect(space.kind).to.equal(SyntaxKind.whitespace)
    expect(eof.kind).to.equal(SyntaxKind.EOF)
    expect(scanner.getCurrentLine()).to.equal(3)
  })

  it('scans integers', function () {
    const scanner = new Scanner('012345678', {})
    const token = scanner.scan()

    expect(token.kind).to.equal(SyntaxKind.numeric_literal)
    expect(token.value).to.equal(12345678)
  })

  it('scans floats', function () {
    const scanner = new Scanner('123.456', {})
    const token = scanner.scan()

    expect(token.kind).to.equal(SyntaxKind.numeric_literal)
    expect(token.value).to.equal(123.456)
  })

  it ('scans miscellaneous terminals',  function() {
    const scanner = new Scanner(', . ; ( )')
    const tokens = scanAll(scanner)

    assertTokenKinds(tokens, [
      SyntaxKind.commaToken,
      SyntaxKind.dotToken,
      SyntaxKind.semiColonToken,
      SyntaxKind.openParen,
      SyntaxKind.closeParen
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
    const scanner = new Scanner("'hello world, I''m Ross'", {})
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
      SyntaxKind.plusToken,
      SyntaxKind.minusToken,
      SyntaxKind.mulToken,
      SyntaxKind.divToken,
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
    // The at sign, dollar sign ($), number sign, or underscore.
    // nothing wrong here...
    const ident = 'foo _bar1 @baz #tbl'
    const scanner = new Scanner(ident, {})
    const tokens = scanAll(scanner)

    assertTokens(tokens, [
      { kind: SyntaxKind.identifier, value: 'foo' },
      { kind: SyntaxKind.identifier, value: '_bar1' },
      { kind: SyntaxKind.identifier, value: '@baz' },
      { kind: SyntaxKind.identifier, value: '#tbl' },
    ])
  })

  it('scans complex identifiers', function () {
    const ident = '[foo].b@r."$b_z"'
    const scanner = new Scanner(ident, {})
    const token = scanner.scan()

    // todo: should be 3 identifiers separated by dotTokens
    expect(token.kind).to.equal(SyntaxKind.identifier)
    expect(token.value).to.equal(ident)
  })

  it('scans insane identifiers', function () {
    // this is ACTUALLY a temp table...named #"sometable"
    const scanner = new Scanner('"#""sometable"""')
    const token = scanner.scan()

    // and the name should actually be...
    expect(token.kind).to.equal(SyntaxKind.identifier)
  })

  it ('scans some really complex stuff', function() {
    const sink = readFileSync('./test/mssql/kitchen_sink.sql', 'utf8')
    const scanner = new Scanner(sink)
    const tokens = scanAll(scanner)

    console.log(tokens.map(tokenToString).join('\r\n'))
  })
})
