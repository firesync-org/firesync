import { Y } from '../y'

type NestedYType = string | Y.Text | Y.Map<NestedYType> | Y.Array<NestedYType>

export type YTypeName = 'string' | 'text' | 'map' | 'array'

export type RandomUpdateConfig = {
  /**
   * Relative weights of how often we insert or delete in Y.Text instances
   */
  textOperationWeights?: Map<'insert' | 'delete', number>
  /**
   * Average length of the amount of text to be inserted or deleted
   */
  textAvgOperationLength?: number
  /**
   * Relative weights of how often to insert text 'after' the previous insertion,
   * or 'elsewhere'
   */
  textInsertPositionWeights?: Map<'after' | 'elsewhere', number>
  /**
   * Relative weights of how often we insert, update or delete a key in Y.Map instances
   */
  mapOperationWeights?: Map<'insert' | 'update' | 'delete', number>
  /**
   * Relative weights of how often we insert which type of object into a Y.Map
   */
  mapInsertTypeWeights?: Map<YTypeName, number>
  /**
   * Relative weights of how often we insert, delete or update in Y.Array instances
   */
  arrayOperationWeights?: Map<'insert' | 'update' | 'delete', number>
  /**
   * Average length of the number of entries to be inserted or deleted into an array
   */
  arrayAvgOperationLength?: number
  /**
   * Relative weights of how often we insert which type of object into a Y.Array
   */
  arrayInsertTypeWeights?: Map<YTypeName, number>
}

/**
 * A cache to hold the position of previously inserted text so that we can
 * follow on with future updates
 */
const prevRandomUpdates = new Map<Y.Text, number>()

/**
 * Apply a random operation to a Yjs object, which can be a Y.Text, Y.Array or Y.Map
 * instance. Supports nested values, where nested instances Y.Text, Y.Array or Y.Map
 * can also have operations applied to them. By default nested entries are not created
 * but can be by overriding config.arrayInsertTypeWeights and config.mapInsertTypeWeights
 */
export const applyRandomUpdate = (
  yvalue: Y.Text | Y.Map<NestedYType> | Y.Array<NestedYType>,
  config: RandomUpdateConfig = {}
) => {
  if (yvalue instanceof Y.Text) {
    applyRandomUpdateToYText(yvalue, config)
  } else if (yvalue instanceof Y.Map) {
    applyRandomUpdateToYMap(yvalue, config)
  } else if (yvalue instanceof Y.Array) {
    applyRandomUpdateToYArray(yvalue, config)
  }
}

/**
 * Randomly insert or delete text from a Y.Text instance.
 */
const applyRandomUpdateToYText = (
  ytext: Y.Text,
  config: RandomUpdateConfig = {}
) => {
  const {
    textOperationWeights = new Map([
      ['insert', 0.8],
      ['delete', 0.2]
    ]),
    textAvgOperationLength = 5,
    textInsertPositionWeights = new Map([
      ['after', 0.9],
      ['elsewhere', 0.1]
    ])
  } = config
  let index = Math.floor(Math.random() * (ytext.length + 1))
  const length = Math.floor(Math.random() * textAvgOperationLength * 2)
  const operation =
    ytext.length === 0 ? 'insert' : weightedRandom(textOperationWeights)
  switch (operation) {
    case 'insert': {
      const prevIndex = prevRandomUpdates.get(ytext)
      if (
        weightedRandom(textInsertPositionWeights) === 'after' &&
        prevIndex !== undefined
      ) {
        index = Math.max(prevIndex, ytext.length - 1)
      }
      ytext.insert(index, Array(length).join(randomChar()))
      prevRandomUpdates.set(ytext, index + length)
      break
    }
    case 'delete': {
      // Don't overflow the end if length is greater than we have to delete
      ytext.delete(index, clamp(length, 0, ytext.length - index))
      break
    }
  }
}

/**
 * Randomly insert, update or delete a key from a Y.Map.
 * Supports nested values, where updates to Y.Text, Y.Array or Y.Map
 * values with call applyRandomUpdate on the value
 */
const applyRandomUpdateToYMap = (
  ymap: Y.Map<NestedYType>,
  config: RandomUpdateConfig = {}
) => {
  const {
    mapOperationWeights = new Map([
      ['insert', 0.1],
      ['update', 0.85],
      ['delete', 0.05]
    ]),
    mapInsertTypeWeights = new Map([['string', 1]])
  } = config
  const operation =
    ymap.size === 0 ? 'insert' : weightedRandom(mapOperationWeights)
  switch (operation) {
    case 'insert': {
      const key = randomString(5)
      const insertType = weightedRandom(mapInsertTypeWeights)
      switch (insertType) {
        case 'string': {
          const value = randomString(10)
          // console.log('set', { key, value })
          ymap.set(key, value)
          break
        }
        case 'array': {
          ymap.set(key, new Y.Array())
          break
        }
        case 'text': {
          ymap.set(key, new Y.Text())
          break
        }
        case 'map': {
          ymap.set(key, new Y.Map())
          break
        }
      }
      break
    }
    case 'delete': {
      // Delete
      const key = randomItem(Array.from(ymap.keys()))
      ymap.delete(key)
      break
    }
    case 'update': {
      // Update
      const key = randomItem(Array.from(ymap.keys()))
      const currentValue = ymap.get(key)
      if (typeof currentValue === 'string') {
        const newValue = randomString(10)
        ymap.set(key, newValue)
      } else if (currentValue !== undefined) {
        applyRandomUpdate(currentValue, config)
      }
      break
    }
  }
}

/**
 * Randomly insert, update or delete an entry from a Y.Array.
 * Supports nested values, where updates to Y.Text, Y.Array or Y.Map
 * values with call applyRandomUpdate on the value
 */
const applyRandomUpdateToYArray = (
  yarray: Y.Array<NestedYType>,
  config: RandomUpdateConfig = {}
) => {
  const {
    arrayOperationWeights = new Map([
      ['insert', 0.2],
      ['update', 0.6],
      ['delete', 0.2]
    ]),
    arrayInsertTypeWeights = new Map([['string', 1]]),
    arrayAvgOperationLength = 3
  } = config
  const index = Math.floor(Math.random() * (yarray.length + 1))
  const length = Math.floor(Math.random() * arrayAvgOperationLength * 2)
  const operation =
    yarray.length === 0 ? 'insert' : weightedRandom(arrayOperationWeights)
  switch (operation) {
    case 'insert': {
      const insertType = weightedRandom(arrayInsertTypeWeights)
      switch (insertType) {
        case 'string': {
          const values = Array(length).fill(randomString(10))
          // console.log('set', { key, values })
          yarray.insert(index, values)
          break
        }
        case 'array': {
          yarray.insert(index, [new Y.Array()])
          break
        }
        case 'text': {
          yarray.insert(index, [new Y.Text()])
          break
        }
        case 'map': {
          yarray.insert(index, [new Y.Map()])
          break
        }
      }
      break
    }
    case 'update': {
      const index = Math.floor(yarray.length * Math.random())
      const value = yarray.get(index)
      if (typeof value === 'string') {
        yarray.delete(index, 1)
        yarray.insert(index, [randomString(10)])
      } else {
        applyRandomUpdate(value, config)
      }
      break
    }
    case 'delete': {
      // console.log('delete', { index, length })
      yarray.delete(index, clamp(length, 0, yarray.length - index))
      break
    }
  }
}

const clamp = (value: number, lower: number, upper: number) =>
  Math.max(lower, Math.min(upper, value))

const randomChar = () =>
  String.fromCharCode(32 + Math.floor(Math.random() * 94))

const randomString = (length = 5) => Array(length).map(randomChar).join("")

const randomItem = <T>(array: T[]) => {
  return array[Math.floor(Math.random() * array.length)]!
}

const weightedRandom = <T extends string>(weights: Map<T, number>) => {
  const totalWeight = Array.from(weights.values()).reduce((a, b) => a + b, 0)
  const normedWeights = Array.from(weights.entries()).map(
    ([key, weight]) => [key, weight / totalWeight] as [T, number]
  )
  const rand = Math.random()
  let sum = 0
  for (const [key, weight] of normedWeights) {
    sum += weight
    if (sum >= rand) {
      return key
    }
  }
  throw new Error("Can't reach here!")
}
