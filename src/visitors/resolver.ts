import { isLetter, isUpper } from '../chars'
import { assert } from 'console';

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

class NameTable {
  private map: Map<number, Symbol>

  /**
   * @param prefix coommon prefix used by all members of the table
   *  such as @ for locals, or # for temp tables [optional]
   */
  constructor(private prefix?: string) {
    this.map = new Map<number, Symbol>()
  }

  add(name: string, decl: Decl) {
    if (this.prefix) {
      if (!name.startsWith(this.prefix)) {
        // this is pretty much just for me
        throw 'ERR: name missing required prefix'
      }
    }

    const hash = this.computeHash(name)
    if (this.map.get(hash)) {
      throw 'ERR: symbol redefined: ' + name
    }

    const sym = <Symbol>{
      id: global_symbol++,
      decl: decl
    }

    this.map.set(hash, sym)
  }

  get(name: string) {
    return this.map.get(this.computeHash(name))
  }

  // fnv hash of the string, converting upper letters
  // to their lower equivalent, but keeping all other characters
  // intact.
  private computeHash(name: string) {
    const len = name.length
    let x = 0xcbf29ce484222325
    for (let i = 0; i < len; i++) {
      const c = name.charCodeAt(i)

      if (isLetter(c) && isUpper(c)) {
        x ^= c + 32
      } else {
        x ^= c
      }

      x *= 0x100000001b3
      x ^= x >> 32
    }

    return x
  }
}

type DeclType =
  | 'database'
  | 'schema'
  | 'table'
  | 'local'
  | 'type'

export class Scope {
  private types?: NameTable
  private schemas?: NameTable
  private databases?: NameTable
  private locals?: NameTable

  // tables in the default schema of the db
  // can be resolved without a schema qualifier
  private default_tables?: NameTable
  private temp_tables?: NameTable

  constructor(private parent?: Scope) { }

  define(type: DeclType, name: string, decl: Decl) {
    switch (type) {

      case 'database': {
        if (!this.databases) {
          this.databases = new NameTable()
        }

        this.databases.add(name, decl)
        break
      }

      case 'local': {
        if (!this.locals) {
          this.locals = new NameTable()
        }

        this.locals.add(name, decl)
        break
      }

      case 'type': {
        if (!this.types) {
          this.types = new NameTable()
        }

        this.types.add(name, decl)
        break
      }

    }
  }

  /**
   * Attempts to resolve a name within this scope, or a parent scope
   *  usage:
   *
   */
  resolve(name: string, hint?: SymbolKind): Symbol | undefined {
    let sym = undefined

    if (name.startsWith('@') && this.locals) {
      sym = this.locals.get(name)
    } else if (name.startsWith('#') && this.temp_tables) {
      sym = this.temp_tables.get(name)
    } else {
      // okay now we'll make use of the hints

      switch (hint) {
        // start at the top if we don't have a hint
        // and just fall through til we hit a match
        default:

        case SymbolKind.table: { /* fallthrough */
          if (this.default_tables) {
            sym = this.default_tables.get(name)

            if (sym) { break }
          }
        }

        case SymbolKind.schema: { /* fallthrough */
          if (this.schemas) {
            sym = this.schemas.get(name)

            if (sym) { break }
          }
        }

        // todo:
        case SymbolKind.cursor:
        case SymbolKind.local_scalar:
        case SymbolKind.local_table:
        case SymbolKind.column:
      }
    }

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
