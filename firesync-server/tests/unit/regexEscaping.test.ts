import { expect } from 'chai'
import { simplePatternToRegex } from '../../src/server/http/middleware/setCorsHeaders'

describe('simplePatternToRegex', () => {
  test('escaping strings', () => {
    expect(simplePatternToRegex('*').toString()).to.equal(/^.*$/.toString())
    expect(simplePatternToRegex('*.example.com').toString()).to.equal(
      /^.*\.example\.com$/.toString()
    )
    expect(simplePatternToRegex('.+?^${}()|[]\\').toString()).to.equal(
      /^\.\+\?\^\$\{\}\(\)\|\[\]\\$/.toString()
    )
    expect(simplePatternToRegex('foo.example.com').toString()).to.equal(
      /^foo\.example\.com$/.toString()
    )
  })
})
