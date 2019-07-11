require('./setup')
const filterUndefined = require('../lib/filter')

describe('filterUndefined', () => {
  it('should filter undefined values from an object tree', () => {
    const input = {
      foo: 1,
      bar: true,
      baz: 'something',
      del: undefined,
      arr: [
        3.5,
        false,
        undefined,
        'keep',
        {},
        {
          a: 2,
          b: undefined
        }
      ],
      obj: {
        a: 3,
        b: null,
        c: undefined,
        arr: []
      }
    }
    const result = filterUndefined(input)
    result.should.eql({
      foo: 1,
      bar: true,
      baz: 'something',
      arr: [
        3.5,
        false,
        'keep',
        {},
        {
          a: 2
        }
      ],
      obj: {
        a: 3,
        b: null,
        arr: []
      }
    })
  })

  it('should throw on circular objects', () => {
    const input = { a: {} }
    input.a.circ = input

    ;(() => { filterUndefined(input) }).should.throw()
  })
})
