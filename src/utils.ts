/**
 * Collection of miscellaneous utility functions
 */

import {
  readFile,
  readdir
} from 'fs'

import * as path from 'path'

import { Identifier } from './ast'

import { promisify } from 'util'

export const readDirAsync = promisify(readdir)
export const readFileAsync = promisify(readFile)

export function bufferToString(buffer: Buffer) {
  let len = buffer.length

  if (len >= 2) {
    // funky big-endian conversion.
    if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
      len &= -2
      for (let i = 0; i < len; i += 2) {
        const temp = buffer[i]
        buffer[i] = buffer[i + 1]
        buffer[i + 1] = temp
      }

      return buffer.toString('utf16le', 2)
    }

    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
      return buffer.toString('utf16le', 2)
    }

    if (len >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return buffer.toString('utf8', 3)
    }
  }

  return buffer.toString('utf8')
}

// does allocations but whatever, I'll optimize later
export function formatIdentifier(id: Identifier) {
  return id.parts.map(p => p.replace(/"\[\]/g, '')).join('.')
}

// bit of a hack until I get my semantic model
// working...
export function matchIdentifier(left?: Identifier, right?: Identifier) {
  if (!left || !right) return true
  if (left.parts.length !== right.parts.length) return false

  return compare(
    formatIdentifier(left),
    formatIdentifier(right))
}

// sql is case invariant, so base sensitivity should be perfect
// just plz don't use diacritic marks
const collator = new Intl.Collator(undefined, { sensitivity: 'base' })

export function compare(left: string, right: string) {
  return collator.compare(left, right) === 0
}

export function binarySearch(array: Array<number>, key: number) {
  let low = 0
  let high = array.length - 1
  while (low <= high) {
    const mid = low + (high - low / 2)
    const val = array[mid]

    if (val == key) {
      return mid
    }

    if (val < key) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return ~low
}
