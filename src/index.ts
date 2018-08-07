
import { printNodes, PrintVisitor } from './print_visitor'
import { Parser, ParserException, isLocal, isTemp } from './parser'

import { promisify, isNumber } from 'util'

import {
  join,
  normalize
} from 'path'

import {
  readFile,
  readdir,
  statSync
} from 'fs'

import yargs from 'yargs'
import { SyntaxKind } from './syntax'
import { getFlagsForEdition, getSupportedEditions } from './features'
import { ExampleLintVisitor } from './lint_visitor'

const readDirAsync = promisify(readdir)
const readFileAsync = promisify(readFile)

yargs
  .usage('$0 <cmd> [options]')
  .command('print [path]', 'the directory or file to print', (y: yargs.Argv) => {
    return y.positional('path', {
      describe: 'the file or directory to print',
      default: '.\*.sql'
    })
  }, (a: yargs.Arguments) => {
    // do stuff with the sub-command
    run('print', a)
  })
  .command('lint [path] [options]', 'the directory or file to lint', (y: yargs.Argv) => {
    return y.positional('path', {
      describe: 'the file or directory to lint',
      default: '.\*.sql'
    })
      .option('severity', {
        alias: 'sev',
        description: 'the minimum severity to report',
        default: 'warning',
        choices: ['info', 'warning', 'error']
      })
  }, (a: yargs.Arguments) => {
    // do stuff with the sub-command
    run('lint', a)
  })
  .option('edition', {
    alias: 'e',
    default: 'sql-server',
    choices: getSupportedEditions()
  })
  .option('verbose', {
    alias: 'v',
    default: false
  })
  .demandCommand()
  .help('h')
  .alias('h', 'help')
  .argv

function run(op: string, args: yargs.Arguments) {

  const pathOrFile = args.path
  if (pathOrFile.indexOf('*') === -1) {
    const path = pathOrFile.startsWith('.')
      ? normalize(join(process.cwd(), pathOrFile))
      : pathOrFile

    processFile(path, op, args)
  } else {
    // else it's a pattern.
    // relative OR absolute
    // ex: ./somedir/sql/*.sql
    const prefix = pathOrFile.substr(0, pathOrFile.indexOf('*'))
    const suffix = pathOrFile.substring(prefix.length)

    if (suffix.indexOf('**') != -1) {
      process.stderr.write('glob patterns not implemented')
      process.exit(-1)
    }

    const root = normalizeRootDirectory(prefix, pathOrFile)

    // .+\.sql$
    const pattern = new RegExp(suffix.replace('.', '\\.').replace('*', '.+') + '$')

    processDirectory(root, pattern, op, args)
  }
}

/**
 * Converts a relative or abs path to an abs path
 * @param prefix a string containing a relative or absolute path
 */
function normalizeRootDirectory(prefix: string, path: string) {
  return !path.startsWith('.')
    ? normalize(prefix)
    : normalize(join(process.cwd(), prefix))
}

async function processDirectory(dir: string, pattern: RegExp, op: string, args: yargs.Arguments) {
  const contents = await readDirAsync(dir)

  if (contents) {
    for (let i = 0; i < contents.length; i++) {
      const child = contents[i]
      const path = normalize(join(dir, child))
      const stat = statSync(path)

      if (stat.isFile()) {
        if (pattern.test(child)) {
          await processFile(path, op, args)
        }
      }
    }

    console.log(`Success: ${success} | Fail: ${fail}`)
  }
}

let success = 0, fail = 0

export async function processFile(path: string, op: string, args: yargs.Arguments) {
  const buff = await readFileAsync(path)
  const text = bufferToString(buff)

  const parser = new Parser(text, {
    debug: args.verbose,
    skipTrivia: true,
    path: path,
    features: getFlagsForEdition(args.edition, '2016'), // hack: fix this later
  })

  try {
    const tree = parser.parse()
    success++
    if (op === 'print') {
      console.log('# ' + path)
      printNodes(tree)
      console.log('\n')
    }

    if (op === 'lint') {
      const visitor = new ExampleLintVisitor(parser, args.severity)

      for (const node of tree) {
        visitor.visit(node)
      }

      if (args.severity === 'info') {
        for (const key of parser.getKeywords()) {
          visitor.visitKeyword(key)
        }
      }

      if (visitor.hasIssues) {
        process.exitCode = -1
      }
    }
  }
  catch (e) {
    fail++
    if (e instanceof ParserException) {
      const ex = <ParserException>e
      console.log(ex.message)

      // means we're debugging
      if (ex.nodes) {
        console.log('AST trace:')

        const visitor = new PrintVisitor()
        let i = 0
        for (const node of ex.nodes) {
          console.log('######################')
          console.log('## Node: ' + i + ' ' + SyntaxKind[node.kind])
          console.log('######################')

          try {
            visitor.visit(node)
          } catch { }
          console.log('\n######################')
          console.log('\n\n')

          i++
        }

        printNodes(ex.nodes)
      }
    }
    else console.log(e)
  }
}

// # Utils
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
