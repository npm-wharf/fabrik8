'use strict'

const seen = []
module.exports = function filterUndefined (obj) {
  if (typeof obj === 'string' ||
    typeof obj === 'number' ||
    typeof obj === 'boolean' ||
    obj === null) return obj

  if (seen.includes(obj)) throw new Error('circular object')
  seen.push(obj)
  if (Array.isArray(obj)) {
    const newArr = obj.filter(val => val !== undefined).map(filterUndefined)
    seen.pop()
    return newArr
  }

  const newObj = {}
  Object.keys(obj).forEach(key => {
    const val = obj[key]
    if (val === undefined) return
    newObj[key] = filterUndefined(val)
  })
  seen.pop()
  return newObj
}
