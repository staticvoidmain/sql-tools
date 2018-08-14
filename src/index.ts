/**
 * TODO(HIGH): new project: sql-lint, separate this from the parser
 */

import { printNodes, PrintVisitor } from './visitors/print_visitor'
import { Parser, ParserException } from './parser'

import {
  relative,
  dirname
} from 'path'

import { sync as glob } from 'glob'

import yargs from 'yargs'
import { SyntaxKind } from './syntax'
import { getFlagsForEdition, getSupportedEditions } from './features'
import { ExampleLintVisitor } from './visitors/lint_visitor'

import {
  bufferToString,
  readFileAsync,
  readDirAsync
} from './utils'

import { MetadataVisitor, Metadata, collectNodes } from './visitors/meta_visitor'

// to show some stats at the end
let success = 0, fail = 0, dir = ''
type Handler = (parser: Parser, path: string) => Promise<void>

async function run(args: yargs.Arguments, cb: Handler) {
  dir = getNearestCommonAncestor(args.paths)

  for (const p of args.paths) {
    const files = glob(p)

    for (const f of files) {
      await processFile(f, args, cb)
    }
  }
}

function directoryName(path: string) {
  const star = path.indexOf('*')
    if (star === -1) {
      return dirname(path)
    }

    return path.substr(0, star)
}

function getNearestCommonAncestor(paths: string[]) {
  if (paths.length === 1) {
    return directoryName(paths[0])
  }

  const dirs = paths.map(directoryName)
  const min = dirs.reduce((min, dir) =>
    Math.min(min, dir.length), dirs[0].length)

  let i = 0
  const base = dirs[0].toLowerCase()
  for (; i < min; i++) {
    const c = base.charCodeAt(i)

    for (let j = 1; j < dirs.length; j++) {
      const current = dirs[j].charCodeAt(i)
      // let's do case invariant
      if (current !== c && current + 32 !== c) {
        break
      }
    }
  }

  return dirs[0].substr(0, i)
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
  .usage('$0 <cmd> [options]')
  .command('print <paths..>', 'print abstract syntax trees for debugging', (y: yargs.Argv) => {
    return y.positional('paths', {
      describe: 'list of files or directories to process'
    })
  }, async (a: yargs.Arguments) => {
    await run(a, async (parser, path) => {
      console.log('## ' + path)
      printNodes(parser.parse())
      console.log('\n\n')
    })

    console.log(`Success: ${success} | Fail: ${fail}`)
  })
  .command('lint <paths..>', 'perform static analysis', (y: yargs.Argv) => {
    return y.positional('paths', {
      describe: 'list of files or directories to process'
    })
      .option('severity', {
        alias: 'sev',
        description: 'the minimum severity to report',
        default: 'warning',
        choices: ['info', 'warning', 'error']
      })
  }, async (a: yargs.Arguments) => {
    await run(a, async (parser) => {
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
  .command('graph <paths..>', 'create a metadata diagram', (y: yargs.Argv) => {
    return y.positional('paths', {
      describe: 'list of files or globs to graph'
    })
    .option('include-temp', {
      alias: 't',
      default: false
    })
  }, async (a: yargs.Arguments) => {

    // todo: how can I visually distinguish different folders?
    // subgraphs?
    const metaStore: Metadata[] = []
    await run(a, async (parser, path) => {
      // todo: relative paths are a little... fiddly.
      // if we accept multiples...
      const rel = relative(dir, path)
      const visitor = new MetadataVisitor(rel, a.includeTemp)
      const tree = parser.parse()
      visitor.visit_each(tree)

      // todo: don't pass empty metadata...
      metaStore.push(visitor.getMetadata())
    })

    const o = process.stdout
    o.setDefaultEncoding('utf8')

    function link_read(f: number, obj: string, color: string) {
      const key = obj.toLowerCase()
      o.write(`"n${nodes[key]}":e->"f${f}":w[color=${color}];\n`)
    }

    function link_write(f: number, obj: string, color: string) {
      const key = obj.toLowerCase()
      o.write(`"f${f}":e->"n${nodes[key]}":w[color=${color}];\n`)
    }

    o.write('digraph g {\n')
    o.write('rankdir=LR;\n')
    o.write('node[shape=box,style=filled,fillcolor="#d0d0d0",fontname=helvetica,color=white,height=0.75];\n')
    o.write('edge[penwidth=2.0];\n')
    const nodes = collectNodes(metaStore)
    for (const key in nodes) {
      o.write(`n${nodes[key]}[label="${key}"];\n`)
    }

    let f = 0
    for (const meta of metaStore) {
      // backspace causes problems for the svg output
      const file = meta.path.replace(/\\/g, '/')

      o.write(`f${f}[label="${file}",shape=cds,fillcolor=dodgerblue,fontcolor=white];\n`)

      for (const obj of meta.read) { link_read(f, obj, 'cyan') }
      for (const obj of meta.create) { link_write(f, obj, 'green') }
      for (const obj of meta.update) { link_write(f, obj, 'yellow') }
      for (const obj of meta.delete) { link_write(f, obj, 'red') }

      f++
    }

    o.write('}\n')
  })
  .option('edition', { alias: 'e', default: 'sql-server', choices: getSupportedEditions() })
  .option('verbose', { alias: 'v', default: false })
  .demandCommand()
  .help('h')
  .alias('h', 'help')
  .parse()
