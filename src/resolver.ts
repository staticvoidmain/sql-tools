import { isLetter, isUpper } from './chars'
import { Visitor } from './visitors/abstract_visitor'
import { SelectStatement, SyntaxNode, DeclareStatement } from './ast'
import { SyntaxKind } from './syntax';

/*

some notes:

  - top-level doubly-linked-list, rooted at the "global" or batch scope
  this can be replaced with a "GO" statement.

  [scope #0]

  declare @asdf int;

  // eh... maybe just
  scope.define(local('@asdf', INT)

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
  cte,
  temp_table,

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
  // | ProcedureDecl
  // | ViewDecl
  // | CteDecl

interface LocalScalarDecl {
  name: string
  type: Type
}

interface LocalTableDecl {
  name: string
  columns: ColumnDecl[]
}

interface QueryDecl { }

interface TableDecl { }

interface ColumnDecl {
  name: string
  ordinal: number
  type: Type
}

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
      throw Error('ERR: symbol redefined: ' + name)
    }

    this.map.set(hash, decl)
  }

  get(name: string) {
    return this.map.get(computeHash(name))
  }
}

export class Scope {
  private symbols = new NameTable()

  constructor(
    private parent?: Scope,
    private name?: string) { }

  define(name: string, decl: Decl) {
    this.symbols.add(name, decl)
    return decl
  }

  /**
   * Attempts to resolve a name within this scope, or a parent scope
   */
  resolve(name: string): Decl | undefined {
    let sym = this.symbols.get(name)

    // walk up the scope chain and try to
    // resolve the symbol there.
    if (!sym && this.parent) {
      sym = this.parent.resolve(name)
    }

    return sym
  }

  createScope(name?: string) {
    return new Scope(this, name)
  }

  findScope(name: string): Scope | undefined {
    if (this.parent) {
      if (this.parent.name === name) {
        return this.parent
      }

      return this.parent.findScope(name)
    }
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

export function schema(name: string, ...tables: TableDecl[]) {
  return {}
}

export function table(name: string, ...columns: ColumnDecl[]): TableDecl {

  return {
    columns: columns.map((c, i) => {
      c.ordinal = i
      return c
    })
  }
}

export function column(name: string, type: Type): ColumnDecl {
  return {
    name,
    type: SymbolKind.column,
    ordinal: 0
  }
}

export function type(name: string, has_len?: boolean, has_precision?: boolean) {
  return {
    name,
    has_len,
    has_precision
  }
}

export function local(name: string, type: Type): LocalScalarDecl {
  return {
    name,
    type
  }
}

// todo: more default types, and some way to
// specify stuff.
export const INT = type('int')
export const BIGINT = type('bigint')
export const BIT = type('bit')
export const VARCHAR = type('varchar')
export const DATETIME = type('datetime')
export const DATE = type('date')

// this scope never gets discarded.
export function createGlobalScope(): Scope {
  const scope = new Scope(undefined, 'global')

  scope.define('int', INT)
  scope.define('bigint', BIGINT)
  scope.define('bit', BIT)
  scope.define('varchar', VARCHAR)
  scope.define('datetime', DATETIME)
  scope.define('date', DATE)

  // scope.define('database', 'master',
  //   schema('sys',
  //     table('objects',
  //       column('object_id', INT),
  //       column('principal_id', INT),
  //       column('schema_id', INT),
  //       column('parent_object_id', INT),
  //       column('type', type('char', 2)),
  //       column('type_desc', type('nvarchar', 60)),
  //       column('create_date', ),
  //       column('modify_date', type('datetime')),
  //       column('is_ms_shipped', BIT),
  //       column('is_published', BIT),
  //       column('is_schema_published', BIT)
  //     )
  //   )
  // )

  return scope
}

// todo: for now we won't actually attempt to resolve type symbols
// just because it's not really "REQUIRED" unless we want to do something
// super super fancy.
export function resolveAll(nodes: SyntaxNode[]) {
  const scope = createGlobalScope()

  for (const node of nodes) {
    switch (node.kind) {
      case SyntaxKind.declare_statement: {
        const decl = <DeclareStatement>node

        if (decl.variables) {
          for (const l of decl.variables) {
            // todo: resolve type
            scope.define(l.name, local(l.name, undefined))
          }
        }
        break
      }

      case SyntaxKind.select_statement: { }
      case SyntaxKind.create_table_as_select_statement: { }
      case SyntaxKind.create_table_statement: { }
      case SyntaxKind.update_statement: { }
      case SyntaxKind.delete_statement: { }
    }
  }
}
