import { } from 'mocha'
import { expect } from 'chai'

import { Scanner } from '../../src/parser/scanner'
import { SyntaxKind } from '../../src/parser/syntax'

describe('Scanner', function () {

  it('scans runs of whitespace', function() {
    const scanner = new Scanner('        ', { });
    const token = scanner.scan();

    expect(token.kind).to.equal(SyntaxKind.whitespace)
  })

  it('scans runs of tabs', function() {
    const scanner = new Scanner('\t\t\t', { });
    const token = scanner.scan();

    expect(token).to.equal(SyntaxKind.whitespace)
  })

  it('scans numbers', function() {
    const scanner = new Scanner('012345678', { });
    const token = scanner.scan();

    expect(token.kind).to.equal(SyntaxKind.numeric_literal)
    expect(token.value).to.equal(12345678);
  })

  it('scans simple strings', function() {
    const scanner = new Scanner("'hello world!'", { });
    const token = scanner.scan();

    expect(token.kind).to.equal(SyntaxKind.string_literal)
    expect(token.value).to.equal('hello world!')
  })

  it('handles escape sequences in strings', function() {
    const scanner = new Scanner("'hello world, I''m Ross'", { });
    const token = scanner.scan();

    expect(token.kind).to.equal(SyntaxKind.string_literal)
    expect(token.value).to.equal("hello world, I'm Ross!")
  })
})