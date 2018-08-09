/**
 * TODO(HIGH): new project: sql-lint, separate this from the parser
 */

import { printNodes, PrintVisitor } from './visitors/print_visitor'
import { Parser, ParserException } from './parser'

import {
  join,
  normalize
} from 'path'

import {
  statSync
} from 'fs'

import yargs from 'yargs'
import { SyntaxKind } from './syntax'
import { getFlagsForEdition, getSupportedEditions } from './features'
import { ExampleLintVisitor } from './visitors/lint_visitor'

import {
  bufferToString,
  readFileAsync,
  readDirAsync,
  getFileName
} from './utils'

import { MetadataVisitor, Metadata, collectNodes } from './visitors/meta_visitor'

// to show some stats at the end
let success = 0, fail = 0
type Handler = (parser: Parser, path: string) => Promise<void>

function run(args: yargs.Arguments, cb: Handler): Promise<void> {
  const pathOrFile = args.path
  const star = pathOrFile.indexOf('*')

  if (star === -1) {
    const path = pathOrFile.startsWith('.')
      ? normalize(join(process.cwd(), pathOrFile))
      : pathOrFile

    return processFile(path, args, cb)
  } else {
    // else it's a pattern.
    // relative OR absolute
    // ex: ./somedir/sql/*.sql
    const prefix = pathOrFile.substr(0, star)
    const suffix = pathOrFile.substring(prefix.length)

    if (suffix.indexOf('**') != -1) {
      process.stderr.write('glob patterns not implemented')
      process.exit(-1)
    }

    const root = normalizeRootDirectory(prefix, pathOrFile)

    // .+\.sql$
    const pattern = new RegExp(suffix.replace('.', '\\.').replace('*', '.+') + '$')

    return processDirectory(root, pattern, args, cb)
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

async function processDirectory(dir: string, pattern: RegExp, args: yargs.Arguments, cb: Handler) {
  const contents = await readDirAsync(dir)

  if (contents) {
    for (let i = 0; i < contents.length; i++) {
      const child = contents[i]
      const path = normalize(join(dir, child))
      const stat = statSync(path)

      if (stat.isFile()) {
        if (pattern.test(child)) {
          await processFile(path, args, cb)
        }
      }
    }
  }
}

export async function processFile(path: string, args: yargs.Arguments, cb: Handler) {
  const buff = await readFileAsync(path)
  const text = bufferToString(buff)

  const parser = new Parser(text, {
    debug: !!args.verbose,
    skipTrivia: true,
    path: path,
    features: getFlagsForEdition(args.edition, '2016'), // hack: fix this later
  })

  try {
    await cb(parser, path)

    success++
  }
  catch (e) {
    fail++

    if (e instanceof ParserException) {
      if (args.verbose) {
        const ex = <ParserException>e

        if (ex.nodes) {
          console.log(ex.message)
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
    }
    else throw e
  }
}

yargs
  .usage('$0 <cmd> <path> [options]')
  .command('print [path]', 'print abstract syntax trees for debugging', (y: yargs.Argv) => {
    return y.positional('path', {
      describe: 'the file or directory to print',
      type: 'string'
    })
  }, async (a: yargs.Arguments) => {
    await run(a, async (parser, path) => {
      console.log('## ' + path)
      printNodes(parser.parse())
      console.log('\n\n')
    })

    console.log(`Success: ${success} | Fail: ${fail}`)
  })
  .command('lint [path]', 'perform static analysis', (y: yargs.Argv) => {
    return y.positional('path', {
      describe: 'the file or directory to lint',

    })
      .option('severity', {
        alias: 'sev',
        description: 'the minimum severity to report',
        default: 'warning',
        choices: ['info', 'warning', 'error']
      })
  }, (a: yargs.Arguments) => {
    run(a, async (parser) => {
      const visitor = new ExampleLintVisitor(parser, a.severity)

      for (const node of parser.parse()) {
        visitor.visit(node)
      }

      if (a.severity === 'info') {
        for (const key of parser.getKeywords()) {
          visitor.visitKeyword(key)
        }
      }

      if (visitor.hasIssues) {
        process.exitCode = -1
      }
    })

    console.log(`Success: ${success} | Fail: ${fail}`)
  })
  .command('graph [path]', 'create a metadata diagram', (y: yargs.Argv) => {
    return y.positional('path', {
      describe: 'the file or directory to graph'
    })
  }, async (a: yargs.Arguments) => {

    const metaStore: Metadata[] = []
    await run(a, async (parser, path) => {
      const visitor = new MetadataVisitor(path)
      const tree = parser.parse()
      visitor.visit_each(tree)

      // todo: don't pass empty metadata...
      metaStore.push(visitor.getMetadata())
    })

    const o = process.stdout
    o.setDefaultEncoding('utf8')

    function link_read(f: number, obj: string) {
      const key = obj.toLowerCase()
      o.write(`"n${f}":e->"f${nodes[key]}":w;\n`)
    }

    function link_write(f: number, obj: string) {
      const key = obj.toLowerCase()
      o.write(`"f${f}":e->"n${nodes[key]}":w;\n`)
    }

    o.write('digraph g {\n')
    o.write('rankdir=LR;\n')
    o.write('node[shape=Mrecord];\n')
    const nodes = collectNodes(metaStore)
    for (const key in nodes) {
      o.write(`n${nodes[key]}[label="${key}"];\n`)
    }

    let f = 0
    for (const meta of metaStore) {
      const file = getFileName(meta.path)

      o.write(`f${f}[label="${file}"];\n`)

      for (const obj of meta.read)   { link_read(f, obj) }
      for (const obj of meta.create) { link_write(f, obj) }
      for (const obj of meta.update) { link_write(f, obj) }
      for (const obj of meta.delete) { link_write(f, obj) }

      f++
    }

    o.write('}\n')
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
  .parse()
