/**
 * Collection of miscellaneous utility functions
 */
import { promisify } from 'util'

import {
  readFile,
  readdir
} from 'fs'

import { Identifier } from './ast'

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

export function formatIdentifier(id: Identifier) {
  return id.parts.map(p => p.replace(/"\[\]/g, '')).join('.')
}
