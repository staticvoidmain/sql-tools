import { isLetter, isUpper } from './chars'
import { Visitor } from './visitors/abstract_visitor'
import { SelectStatement, SyntaxNode, DeclareStatement, TableDeclaration, ColumnDefinition, CreateTableElement, Expr, ComputedColumnDefinition, IdentifierExpression, Identifier } from './ast'
import { SyntaxKind } from './syntax';
import { last } from './utils';

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

export interface Symbol {
  id: number
  decl: Decl
}

export enum SymbolKind {
  alias,
  type,
  column,
  schema,
  local_scalar,
  local_table,
  table,
  cursor,
  cte,
  temp_table
}

// not sure what to do with this yet.
interface Type { }

// bottom of the semantic stuff
interface Entity {
  name: string
  kind: SymbolKind
  parent?: Decl
  references?: Decl[]
}

type Decl =
  | LocalScalarDecl
  | LocalTableDecl
  | TableDecl
  | ColumnDecl
  // | ProcedureDecl
  // | ViewDecl
  // | CteDecl

interface LocalScalarDecl extends Entity {
  type?: Type
}

interface LocalTableDecl extends Entity {
  columns: ColumnDecl[]
}

interface QueryDecl extends Entity { }

interface TableDecl extends Entity {
  columns: ColumnDecl[]
}

interface ColumnDecl extends Entity {
  // todo: type tags
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

  define(decl: Decl) {
    this.symbols.add(decl.name, decl)
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
  return {
    name,
    tables,
    kind: SymbolKind.schema
  }
}

export function table(name: string, ...columns: ColumnDecl[]): TableDecl {

  return {
    name: name,
    kind: SymbolKind.table,
    columns: columns
  }
}

export function column(name: string): ColumnDecl {
  return {
    name: name,
    kind: SymbolKind.column
  }
}

export function alias(name: string, entity: Entity) {
  return {
    name: name,
    kind: SymbolKind.alias,
    entity: entity
  }
}

export function type(name: string, has_len?: boolean, has_precision?: boolean) {
  return {
    name,
    has_len,
    has_precision,
    kind: SymbolKind.type
  }
}

export function local(name: string, type?: Type): LocalScalarDecl {
  return {
    name: name,
    kind: SymbolKind.local_scalar,
  }
}

export function localTable(name: string, ...columns: ColumnDecl[]): LocalTableDecl {
  const table = {
    name: name,
    kind: SymbolKind.local_table,
    columns: columns
  }

  columns.forEach((c, i) => {
    c.parent = table
  })

  return table
}

// todo: more default types, and some way to
// specify stuff.
export const INT = type('int')
export const BIGINT = type('bigint')
export const BIT = type('bit')
export const VARCHAR = type('varchar')
export const DATETIME = type('datetime')
export const DATE = type('date')

// this scope should never get discarded.
let global: Scope
export function createGlobalScope(): Scope {

  if (global) {
    return global
  }

  const scope = new Scope(undefined, 'global')

  scope.define(INT)
  scope.define(BIGINT)
  scope.define(BIT)
  scope.define(VARCHAR)
  scope.define(DATETIME)
  scope.define(DATE)

  return global = scope
}

function resolveExpr(expr: Expr):any {
// todo: return some kind of resolved expr...
// no idea what this should look like
}

function mapColumns(cols:  CreateTableElement[]) {
  const columns = []

  for (const i of cols) {
    if (i.kind === SyntaxKind.computed_column_definition) {
      // todo: resolve expr
      const computed = <ComputedColumnDefinition>i
      columns.push({
        name: computed.name,
        expr: resolveExpr(computed.expression)
      })
    } else if (i.kind === SyntaxKind.column_definition) {
      const column = <ColumnDefinition>i
      // columns.
    }
  }

  return columns
}

function resolveExpr(scope: Scope, expr: Expr) {
// walk expr?
}

function resolveIdentifier(scope: Scope, ident: Identifier) {
  // todo: resolved identifier type
  const first = ident.parts[0]
  const symbol = scope.resolve(first)

  // switch the kinds?
}


// todo: for now we won't actually attempt to resolve type symbols
// just because it's not really "REQUIRED" unless we want to do something
// super super fancy.
export function resolveAll(nodes: SyntaxNode[]) {
  // todo: GET global scope?
  const scope = createGlobalScope()

  // todo:

  for (const node of nodes) {
    switch (node.kind) {
      case SyntaxKind.declare_statement: {
        const decl = <DeclareStatement>node

        if (decl.variables) {
          for (const l of decl.variables) {
            scope.define(local(l.name))
          }
        }
        else {
          const t = <TableDeclaration>decl.table
          const name = t.name.parts[0]
          scope.define(localTable(name, mapColumns(t.body))
        }

        break
      }

      case SyntaxKind.select_statement: {
        const select = <SelectStatement>node
        const selectScope = scope.createScope()

        // define
        if (select.from) {
          for (const src of select.from.sources) {
            // define the FULL name, and any alias
            // should have all the info we need here
            // to resolve this expr

            if (src.expr.kind === SyntaxKind.identifier_expr) {
              // todo: resolve to the named identifier

              const e = <IdentifierExpression>src.expr

              if (src.alias) {
                selectScope.define(
                  alias(last(src.alias.parts),
                  resolveIdentifier(selectScope, e.identifier)))
              }

              break
            }

            const resolved = resolveExpr(selectScope, src.expr)

            if (src.alias) {
              selectScope.define(
                alias(last(src.alias.parts), resolved))
            }

            // if ()
          }
        }

        break
      }

      case SyntaxKind.create_table_as_select_statement: { break }
      case SyntaxKind.create_table_statement: {
        break
      }
      case SyntaxKind.update_statement: { break }
      case SyntaxKind.delete_statement: { break }
    }
  }
}
