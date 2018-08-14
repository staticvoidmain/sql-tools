import { } from 'mocha'
import { expect } from 'chai'
import { Scope, local, INT, createGlobalScope } from '../src/visitors/resolver'

describe('resolver', () => {

  it('ignores case', () => {
    const test = new Scope(undefined, 'test')
    const defined = test.define('@foo', local('foo', INT))
    const resolved = test.resolve('@FOO')

<<<<<<< HEAD
=======
    expect(defined).to.equal(resolved)
  })

  it ('resolves up the scope chain', () => {
    const test = new Scope(undefined, 'test')
    const defined = test.define('@asdf', local('foo', INT))
    const child = test.createScope('child-scope')
    const resolved = child.resolve('@asdf')

    expect(defined).to.equal(resolved)
>>>>>>> 1f4a454ed4bcdc493ab2fc2ee4ecccc58e8639fd
  })

  it ('has a top-level global scope', () => {
    const global = createGlobalScope()
    const resolved = global.resolve('int')

    expect(resolved).to.equal(INT)
  })
})
