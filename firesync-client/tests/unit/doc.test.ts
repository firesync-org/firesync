import { expect } from 'chai'
import { getDoc } from '../../src/doc'

const toJSON = (doc: any) => JSON.parse(JSON.stringify(doc))

describe('getMap', () => {
  describe('string', () => {
    test('should be optional', () => {
      const doc = getDoc('foo', {
        type: 'object',
        properties: {
          foo: {
            type: 'string',
            optional: true
          }
        }
      })
      expect(doc.foo).to.equal(undefined)
      expect(toJSON(doc)).to.deep.equal({})

      doc.foo = 'bar'
      expect(doc.foo).to.equal('bar')
      expect(toJSON(doc)).to.deep.equal({
        foo: 'bar'
      })

      delete doc.foo
      expect(doc.foo).to.equal(undefined)
      expect(toJSON(doc)).to.deep.equal({})
    })

    test('should be non-optional', () => {
      const doc = getDoc('foo', {
        type: 'object',
        properties: {
          foo: {
            type: 'string',
            optional: false,
            default: 'bar'
          }
        }
      })
      expect(doc.foo).to.equal('bar')
      expect(toJSON(doc)).to.deep.equal({
        foo: 'bar'
      })

      doc.foo = 'baz'
      expect(doc.foo).to.equal('baz')
      expect(toJSON(doc)).to.deep.equal({
        foo: 'baz'
      })

      expect(() => delete (doc as any).foo).to.throw(
        /cannot delete non-optional property foo/
      )
    })

    test('should not allow imcompatible types to be set', () => {
      const doc = getDoc('foo', {
        type: 'object',
        properties: {
          foo: {
            type: 'string'
          }
        }
      })

      expect(() => ((doc as any).foo = 42)).to.throw(
        /expected string type for foo on object/
      )
    })
  })

  describe('number', () => {
    test('should be optional', () => {
      const doc = getDoc('foo', {
        type: 'object',
        properties: {
          foo: {
            type: 'number',
            optional: true
          }
        }
      })
      expect(doc.foo).to.equal(undefined)
      expect(toJSON(doc)).to.deep.equal({})

      doc.foo = 42
      expect(doc.foo).to.equal(42)
      expect(toJSON(doc)).to.deep.equal({
        foo: 42
      })

      delete doc.foo
      expect(doc.foo).to.equal(undefined)
      expect(toJSON(doc)).to.deep.equal({})
    })

    test('should be non-optional', () => {
      const doc = getDoc('foo', {
        type: 'object',
        properties: {
          foo: {
            type: 'number',
            optional: false,
            default: 42
          }
        }
      })
      expect(doc.foo).to.equal(42)
      expect(toJSON(doc)).to.deep.equal({
        foo: 42
      })

      doc.foo = 24
      expect(doc.foo).to.equal(24)
      expect(toJSON(doc)).to.deep.equal({
        foo: 24
      })

      expect(() => delete (doc as any).foo).to.throw(
        /cannot delete non-optional property foo/
      )
    })

    test('should not allow imcompatible types to be set', () => {
      const doc = getDoc('foo', {
        type: 'object',
        properties: {
          foo: {
            type: 'number'
          }
        }
      })

      expect(() => ((doc as any).foo = 'bar')).to.throw(
        /expected number type for foo on object/
      )
    })
  })

  describe('boolean', () => {
    test('should be optional', () => {
      const doc = getDoc('foo', {
        type: 'object',
        properties: {
          foo: {
            type: 'boolean',
            optional: true
          }
        }
      })
      expect(doc.foo).to.equal(undefined)
      expect(toJSON(doc)).to.deep.equal({})

      doc.foo = true
      expect(doc.foo).to.equal(true)
      expect(toJSON(doc)).to.deep.equal({
        foo: true
      })

      delete doc.foo
      expect(doc.foo).to.equal(undefined)
      expect(toJSON(doc)).to.deep.equal({})
    })

    test('should be non-optional', () => {
      const doc = getDoc('foo', {
        type: 'object',
        properties: {
          foo: {
            type: 'boolean',
            optional: false,
            default: true
          }
        }
      })
      expect(doc.foo).to.equal(true)
      expect(toJSON(doc)).to.deep.equal({
        foo: true
      })

      doc.foo = false
      expect(doc.foo).to.equal(false)
      expect(toJSON(doc)).to.deep.equal({
        foo: false
      })

      expect(() => delete (doc as any).foo).to.throw(
        /cannot delete non-optional property foo/
      )
    })

    test('should not allow imcompatible types to be set', () => {
      const doc = getDoc('foo', {
        type: 'object',
        properties: {
          foo: {
            type: 'boolean'
          }
        }
      })

      expect(() => ((doc as any).foo = 'bar')).to.throw(
        /expected boolean type for foo on object/
      )
    })
  })

  describe('text', () => {
    test('should be non-optional', () => {
      const doc = getDoc('foo', {
        type: 'object',
        properties: {
          foo: {
            type: 'text',
            optional: false,
            default: ''
          }
        }
      })
      expect(doc.foo.toString()).to.equal('')
      expect(toJSON(doc)).to.deep.equal({
        foo: ''
      })

      doc.foo.insert(0, 'baz')
      expect(doc.foo.toString()).to.equal('baz')
      expect(toJSON(doc)).to.deep.equal({
        foo: 'baz'
      })

      expect(() => delete (doc as any).foo).to.throw(
        /cannot delete text property foo/
      )
    })

    test('should not allow setting', () => {
      const doc = getDoc('foo', {
        type: 'object',
        properties: {
          foo: {
            type: 'text'
          }
        }
      })

      expect(() => ((doc as any).foo = 'bar')).to.throw(
        /cannot set text property foo/
      )
    })
  })

  test('should error on missing properties', () => {
    const doc = getDoc('foo', {
      type: 'object',
      properties: {
        foo: {
          type: 'string'
        }
      }
    })

    expect(() => (doc as any).baz).to.throw(
      /property baz does not exist on object/
    )

    expect(() => ((doc as any).baz = 'foo')).to.throw(
      /property baz does not exist on object/
    )
  })

  test('iterating', () => {
    const doc = getDoc('foo', {
      type: 'object',
      properties: {
        foo: {
          type: 'string'
        },
        bar: {
          type: 'string'
        }
      }
    } as const)

    expect(Object.keys(doc)).to.deep.equal(['foo', 'bar'])
  })

  test('toJSON', () => {
    const doc = getDoc('foo', {
      type: 'object',
      properties: {
        foo: {
          type: 'string'
        },
        bar: {
          type: 'string'
        }
      }
    } as const)

    doc.foo = 'bar'
    doc.bar = 'baz'

    expect(toJSON(doc)).to.deep.equal({
      foo: 'bar',
      bar: 'baz'
    })
  })
})
