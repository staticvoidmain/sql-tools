
import { printNode } from './visitor'
import { Parser } from './parser'

import {
  join,
  normalize
} from 'path'

import {
  readFileSync
} from 'fs'

const args = process.argv.slice(1)

const path = normalize(join(process.cwd(), args[1]))
const file = readFileSync(path, 'utf8')
const parser = new Parser()
const tree = parser.parse(file, {
  ignoreTrivia: true,
  path: path
})

for (const stmt of tree) {
  printNode(stmt)
  process.stdout.write('\n')
}
