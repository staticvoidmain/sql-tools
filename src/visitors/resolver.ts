import { isLetter, isUpper } from '../chars'

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
  schema_name,
  local_scalar,
  local_table,
  table_name,

}

type Decl =
  | LocalScalarDecl
  | LocalTableDecl
  | ColumnDecl

interface LocalScalarDecl {
  kind: SymbolKind
}

interface LocalTableDecl {
  kind: SymbolKind
}

interface ColumnDecl {
  kind: SymbolKind
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

export class Scope {
  // is there a shared global id system?
  // for all symbols... I think so.
  private parent?: Scope
  private schemas?: NameTable
  private databases?: NameTable
  private locals?: NameTable
  private temp_tables?: NameTable

  define(name: string, def: Decl) {
    switch (def.kind) {

    }
  }

  /**
   * Attempts to resolve a name within this scope, or a parent scope
   *  usage:
   *
   * resolve('@foo', SymbolKind.local_scalar)
   */
  resolve(name: string, hint: SymbolKind): Symbol | undefined {
    let sym = undefined

    if (name.startsWith('@') && this.locals) {
      sym = this.locals.get(name)
    } else if (name.startsWith('#') && this.temp_tables) {
      sym = this.temp_tables.get(name)
    } else {
      // okay now we'll make use of the hints



    }

    if (!sym && this.parent) {
      // walk up the scope chain and try to
      // resolve the symbol there.
      sym = this.parent.resolve(name, hint)
    }

    return sym
  }
}

// todo: specialize nameTable to intern strings?
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

const scopes = []

export function createGlobalScope(): Scope {
  // this is gonna take a lot more thought
}
