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

import { MetadataVisitor, Metadata, collectNodes, SqlObject } from './visitors/meta_visitor';

// to show some stats at the end
let success = 0, fail = 0

yargs
  .usage('$0 <cmd> [options]')
  .command('print', 'print abstract syntax trees', (y: yargs.Argv) => {
    return y.positional('path', {
      describe: 'the file or directory to print',
      default: '.\*.sql'
    })
  }, (a: yargs.Arguments) => {
    run(a, (parser, path) => {
      console.log('## ' + path)
      printNodes(parser.parse())
      console.log('\n\n')
    }).then(() => { console.log(`Success: ${success} | Fail: ${fail}`) })
  })
  .command('lint', 'perform static analysis', (y: yargs.Argv) => {
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
    run(a, (parser) => {
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
    }).then(() => { console.log(`Success: ${success} | Fail: ${fail}`) })
  })
  .command('graph', 'create a metadata diagram', (y: yargs.Argv) => {
    return y.positional('path', {
      describe: 'the file or directory to graph',
      default: '.\*.sql'
    })
    .option('output', {
      alias: 'o',
      description: 'Location to generate the diagram dotfile',
      default: ''
    })
    .option('type', {
      alias: 't',
      description: 'The type of diagram to generate',
      default: 'crud',
      choices: ['crud']
    })
  }, (a: yargs.Arguments) => {

    const metaStore: Metadata[] = []
    run(a, (parser, path) => {
      const visitor = new MetadataVisitor(path)
      visitor.visit_each(parser.parse())
      metaStore.push(visitor.getMetadata())
    })

    const o = process.stdout
    o.setDefaultEncoding('utf8')

    // todo: maybe just a general graph
    // for the CRUD stuff, this might get super hairy.
    // if we do an undireceed graph, change -> to --
    o.write('digraph g {\n')
    o.write('node[shape=Mrecord];\n')
    const nodes = collectNodes(metaStore)
    for (const key in nodes) {
      o.write(`node_${nodes[key]}[label=<io>${key}];\n`)
    }

    function link(f: number, port: string, obj: SqlObject) {
      const key = obj.name.toLowerCase()
      o.write(`"file_${f}":${port}->node_${nodes[key]}:<io>;\n`)
    }

    let f = 0
    for (const meta of metaStore) {
      const file = getFileName(meta.path)
      o.write(`file_${f}[label=${file}|{<c>C|<r>R|<u>U|<d>D};\n`)

      // link all the edges
      for (const obj of meta.create) { link(f, 'c', obj) }
      for (const obj of meta.read)   { link(f, 'r', obj) }
      for (const obj of meta.update) { link(f, 'u', obj) }
      for (const obj of meta.delete) { link(f, 'd', obj) }

      f++
    }

    o.write('}')
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

type Handler = (parser: Parser, path: string) => void

async function run(args: yargs.Arguments, cb: Handler) {
  const pathOrFile = args.path
  if (pathOrFile.indexOf('*') === -1) {
    const path = pathOrFile.startsWith('.')
      ? normalize(join(process.cwd(), pathOrFile))
      : pathOrFile

    await processFile(path, args, cb)
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

    await processDirectory(root, pattern, args, cb)
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
    debug: args.verbose,
    skipTrivia: true,
    path: path,
    features: getFlagsForEdition(args.edition, '2016'), // hack: fix this later
  })

  try {
    cb(parser, path)

    success++
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
