import { expect } from 'chai'
import {
  docKeyPatternToRegex,
  wildCardsToRegex
} from '../../src/server/lib/wildCardsToRegex'

describe('wildCardsToRegex', () => {
  test('escaping domains', () => {
    expect(wildCardsToRegex('*').toString()).to.equal(/^.*$/.toString())
    expect(wildCardsToRegex('*.example.com').toString()).to.equal(
      /^.*\.example\.com$/.toString()
    )
    expect(wildCardsToRegex('.+?^${}()|[]\\').toString()).to.equal(
      /^\.\+\?\^\$\{\}\(\)\|\[\]\\$/.toString()
    )
    expect(wildCardsToRegex('foo.example.com').toString()).to.equal(
      /^foo\.example\.com$/.toString()
    )
  })
})

describe('docKeyPatternToRegex', () => {
  test('docKeyPatternToRegex', () => {
    const tests = [
      {
        pattern: '*',
        match: ['foo', 'FOO-BAR', '123'],
        dontMatch: ['foo/1', '/foo', 'foo/']
      },
      {
        pattern: 'foo/*',
        match: ['foo/bar', 'foo/FOO-BAR', 'foo/123'],
        dontMatch: ['foo/', 'foo/bar/foo']
      },
      {
        pattern: 'foo/*/bar',
        match: ['foo/1/bar', 'foo/FOO-BAR/bar', 'foo/123/bar'],
        dontMatch: ['foo//bar', 'foo/one/two/bar']
      },
      {
        pattern: 'foo/*/*/bar',
        match: ['foo/1/2/bar', 'foo/FOO-BAR/baz/bar', 'foo/123/456/bar'],
        dontMatch: ['foo///bar', 'foo/one/bar', 'foo/one/two/three/bar']
      }
    ]

    for (const test of tests) {
      const regex = docKeyPatternToRegex(test.pattern)
      for (const match of test.match) {
        expect(match).to.match(regex)
      }
      for (const dontMatch of test.dontMatch) {
        expect(dontMatch).to.not.match(regex)
      }
    }
  })
})
