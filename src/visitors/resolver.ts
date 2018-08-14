import { isLetter, isUpper } from '../chars'
import { assert } from 'console';
import { Visitor } from './abstract_visitor';
import { SelectStatement } from '../ast';

/*

some notes:

  - top-level doubly-linked-list, rooted at the "global" or batch scope
  this can be replaced with a "GO" statement.

  [scope #0]

  declare @asdf ;

  define(@asdf,

  - each select introduces a new enclosing scope
  - and pops it off when it completes and all names are resolved

  - define all aliases, databases, schemas, locals,
  - and columns (with position to allow for the 1-base order by 1 stuff.
*/

// resolve()
// define()

export interface Symbol {
  id: number
  decl: Decl
}

export enum SymbolKind {
  column,
  schema,
  local_scalar,
  local_table,
  table,
  cursor,

}


interface SymbolDeclaration {
  kind: SymbolKind
}

// not sure what to do with this yet.
interface Type { }

type Decl =
  | LocalScalarDecl
  | LocalTableDecl
  | TableDecl
  | ColumnDecl

interface LocalScalarDecl { }
interface LocalTableDecl { }
interface QueryDecl { }
interface TableDecl { }
interface ColumnDecl {
  ordinal: number
  type: Type
}

let global_symbol = 0


const fnv_prime = 16777619
const hash_base =	0x811c9dc5
const uint = new Uint32Array(new ArrayBuffer(4))

// 32-bit fnv hash of the string, converting upper letters
// to their lower equivalent, but keeping all other characters
// intact.
function computeHash(name: string) {
  const len = name.length
  uint[0] = hash_base
  for (let i = 0; i < len; i++) {
    let c = name.charCodeAt(i)

    if (isLetter(c) && isUpper(c)) {
      c += 32
    }

    uint[0] ^= c
    uint[0] *= fnv_prime
  }

  return uint[0]
}

class NameTable {
  private map: Map<number, Decl>

  /**
   * @param prefix coommon prefix used by all members of the table
   *  such as @ for locals, or # for temp tables [optional]
   */
  constructor(private prefix?: string) {
    this.map = new Map<number, Decl>()
  }

  add(name: string, decl: Decl) {
    if (this.prefix) {
      if (!name.startsWith(this.prefix)) {
        // this is pretty much just for me
        throw 'ERR: name missing required prefix'
      }
    }

    const hash = computeHash(name)
    if (this.map.get(hash)) {
      throw 'ERR: symbol redefined: ' + name
    }

    this.map.set(hash, decl)
  }

  get(name: string) {
    return this.map.get(computeHash(name))
  }
}

type DeclType =
  | 'database'
  | 'schema'
  | 'table'
  | 'local'
  | 'type'

export class Scope {
  private symbols = new NameTable()

  constructor(private parent?: Scope) { }

  define(type: DeclType, name: string, decl: Decl) {
    this.symbols.add(name, decl)
  }

  /**
   * Attempts to resolve a name within this scope, or a parent scope
   *  usage:
   *
   */
  resolve(name: string, hint?: SymbolKind): Decl | undefined {
    let sym = this.symbols.get(name)


    if (!sym && this.parent) {
      // walk up the scope chain and try to
      // resolve the symbol there.
      sym = this.parent.resolve(name, hint)
    }

    return sym
  }

  createScope() {
    return new Scope(this)
  }
}

export enum DataSourceKind {
  unknown,
  table,
  view,
  subquery,
  local_table,
  temp_table,
  shared_temp_table,
  table_valued_function,
  common_table_expression
}

function schema(name: string, ...tables: TableDecl[]) {
  return {}
}

function table(name: string, ...columns: ColumnDecl[]): TableDecl {
  // todo: assign all the columns ordinal numbers
  return {}
}

function column(name: string, type: Type): ColumnDecl {
  return {
    type: SymbolKind.column,
    ordinal: 0
  }
}

// min / max? valid range?
function type(name: string, len?: number, precision?: number) {
  return {
    name,
    len,
    precision
  }
}

// todo: more default types, and some way to
// specify stuff.
const INT = type('int')
const BIGINT = type('bigint')
const BIT = type('bit')

export function createGlobalScope(): Scope {
  const scope = new Scope()

  scope.define('type', 'int', INT)
  scope.define('type', 'bigint', BIGINT)
  scope.define('type', 'bit', BIT)
  scope.define('type', 'varchar', type('varchar'))

  scope.define('database', 'master',
    schema('sys',
      table('objects',
        column('object_id', INT),
        column('principal_id', INT),
        column('schema_id', INT),
        column('parent_object_id', INT),
        column('type', type('char', 2)),
        column('type_desc', type('nvarchar', 60)),
        column('create_date', type('datetime')),
        column('modify_date', type('datetime')),
        column('is_ms_shipped', BIT),
        column('is_published', BIT),
        column('is_schema_published', BIT)
      )
    )
  )

  return scope
}


export class DeclarationVisitor extends Visitor {

  /**
   *
   */
  constructor(private scope: Scope) {
    super()
  }

  visitSelect(select: SelectStatement) {
    const scope = this.scope.createScope()

    // todo: name resolution tieeem

    if (select.from) {
      for (const src of select.from.sources) {
        if ()
      }
    }

  }
}
