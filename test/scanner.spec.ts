import { } from 'mocha'
import { expect } from 'chai'

import { Scanner, Token } from '../src/scanner'
import { SyntaxKind } from '../src/syntax'

function scanAll(scanner: Scanner) {
  const tokens = []

  while (true) {
    const token = scanner.scan();

    if (token.kind === SyntaxKind.EOF) {
      break;
    }

    if (token.kind !== SyntaxKind.whitespace) {
      tokens.push(token);
    }
  }

  return tokens;
}

function assertTokenKinds(actual: Token[], expected: SyntaxKind[]) {
  const actualKinds = actual.map(function(a) { return SyntaxKind[a.kind]; })

  expect(actual.length).to.equal(expected.length, `Incorrect number of tokens scanned! Got: \n ${actualKinds}`)

  for (let index = 0; index < actual.length; index++) {
    expect(actual[index].kind).to.equal(expected[index],
      `[${index}] Expected ${SyntaxKind[expected[index]]} got ${SyntaxKind[actual[index].kind]}`)
  }
}

describe('Scanner', function () {

  it('scans whitespace as a single token', function() {
    const scanner = new Scanner('   \t \t  \r\n\t\r\n  \n   ', { });
    const token = scanner.scan();

    expect(token.kind).to.equal(SyntaxKind.whitespace)
  })

  it('captures line numbers lazily', function() {
    const scanner = new Scanner('   \t \t  \r\n\t\r\n  \n   ', { skipTrivia: true });
    const space = scanner.scan();
    const eof = scanner.scan();

    expect(space.kind).to.equal(SyntaxKind.whitespace)
    expect(eof.kind).to.equal(SyntaxKind.EOF);
    expect(scanner.getCurrentLine()).to.equal(3)
  })

  it('scans integers', function() {
    const scanner = new Scanner('012345678', { });
    const token = scanner.scan();

    expect(token.kind).to.equal(SyntaxKind.numeric_literal)
    expect(token.value).to.equal(12345678);
  })

  it('scans floats', function() {
    const scanner = new Scanner('123.456', { });
    const token = scanner.scan();

    expect(token.kind).to.equal(SyntaxKind.numeric_literal)
    expect(token.value).to.equal(123.456);
  })

  it('scans simple strings', function() {
    const scanner = new Scanner("'hello world!'", { });
    const token = scanner.scan();

    expect(token.kind).to.equal(SyntaxKind.string_literal)
    expect(token.value).to.equal('hello world!')
  })

  it('scans empty strings', function() {
    const scanner = new Scanner("''", { });
    const token = scanner.scan();

    expect(token.kind).to.equal(SyntaxKind.string_literal)
    expect(token.value).to.equal('')
  })

  it('handles escape sequences in strings', function() {
    const scanner = new Scanner("'hello world, I''m Ross'", { });
    const token = scanner.scan();

    expect(token.kind).to.equal(SyntaxKind.string_literal)
    expect(token.value).to.equal("hello world, I''m Ross")
  })

  it('tokenizes keywords regardless of case', function() {
    const scanner = new Scanner('set DECLARE Update InSerT', { });
    const tokens = scanAll(scanner);

    assertTokenKinds(tokens, [
      SyntaxKind.set_keyword,
      SyntaxKind.declare_keyword,
      SyntaxKind.update_keyword,
      SyntaxKind.insert_keyword
    ]);
  })

  it('handles binary operators', function() {
    const scanner = new Scanner('+ - * / > < >= <= !> !< <> !=', { });
    const tokens = scanAll(scanner);
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
    ]);
  })

  it('handles assignment operators', function() {
    const scanner = new Scanner('+= -= *= /= |= &= ^=', { });
    const tokens = scanAll(scanner);
    assertTokenKinds(tokens, [
      SyntaxKind.plusEqualsAssignment,
      SyntaxKind.minusEqualsAssignment,
      SyntaxKind.mulEqualsAssignment,
      SyntaxKind.divEqualsAssignment,
      SyntaxKind.bitwiseOrAssignment,
      SyntaxKind.bitwiseAndAssignment,
      SyntaxKind.bitwiseXorAssignment,
    ]);
  })

  it('scans inline comments', function() {
    const scanner = new Scanner('-- comment\n1234', { });

    expect(scanner.scan().kind).to.equal(SyntaxKind.comment_inline)
    expect(scanner.scan().kind).to.equal(SyntaxKind.numeric_literal)
  })
})
