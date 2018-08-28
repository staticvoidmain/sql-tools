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
  database,
  schema,
  local_scalar,
  local_table,
  table,
  cursor,
  cte,
  temp_table
}

// not sure what to do with this yet.
interface Type {
  is_numeric: boolean
  is_string: boolean
}

// bottom of the semantic stuff
interface Entity {
  name: string
  kind: SymbolKind
  has_children: boolean
  parent?: Decl
  references?: Decl[]
  children?: NameTable
}

type Decl =
  | Alias
  | LocalScalar
  | LocalTable
  | Table // includes temp?
  | Column
  | Schema
  | Database
// | Procedure
// | View
// | CommonTableExpression

// todo: something like this
// interface EntityReference {
//   identity: Identity
//   entity: Entity
// }

// todo: generic type?
interface Alias extends Entity {
  kind: SymbolKind.alias
  // subquery or table alias
  // should be merged when computing
  // entity references
  entity: Entity
}

interface LocalScalar extends Entity {
  type?: Type
  has_children: false
}

interface LocalTable extends Entity {
  kind: SymbolKind.local_table
  has_children: true
}

interface QueryDecl extends Entity { }

interface Database extends Entity {
  kind: SymbolKind.database
  has_children: true
}

interface Schema extends Entity {
  kind: SymbolKind.schema
  has_children: true
}

interface Table extends Entity {
  kind: SymbolKind.table
  has_children: true
}

interface Column extends Entity {
  ordinal: number
  nullable: boolean
  type: string // todo
  has_children: false
}

const fnv_prime = 16777619
const hash_base = 0x811c9dc5
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

  constructor() {
    this.map = new Map<number, Decl>()
  }

  add(name: string, decl: Decl) {
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
  private children: Scope[] = []

  constructor(
    private parent?: Scope,
    private name?: string) {
      if (parent) {
        parent.children.push(this)
      }
    }

  define(decl: Decl) {
    // todo: flag warnings on redefined
    // symbols from parent scopes?

    // if (this.parent) {
    //   const sym = this.parent.resolve(decl.name)

    //   if (sym) {
    //     warn('symbol already defined in a parent scope')
    //   }
    // }

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

  // only looks one layer down, because forget depth-first search.
  findChild(name: string): Scope | undefined {
    if (this.children) {
      for (const c of this.children) {
        if (c.name === name) {
          return c
        }
      }
    }
  }

  findParent(name: string): Scope | undefined {
    if (this.parent) {
      if (this.parent.name === name) {
        return this.parent
      }

      return this.parent.findParent(name)
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

export function database(name: string): Database {
  return <Database>{
    name: name,
    children: new NameTable(),
    kind: SymbolKind.database,
    has_children: true
  }
}

export function schema(name: string): Schema {
  return <Schema>{
    name: name,
    children: new NameTable(),
    kind: SymbolKind.schema,
    has_children: true
  }
}

export function table(name: string): Table {

  return <Table>{
    name: name,
    kind: SymbolKind.table,
    children: new NameTable(),
    has_children: true
  }
}

export function column(name: string): Column {
  return <Column>{
    name: name,
    type: 'todo',
    parent: undefined,
    nullable: false,
    kind: SymbolKind.column,
    references: [],
    ordinal: 0,
    has_children: false
  }
}

export function alias(name: string, entity: Entity): Alias {
  return {
    name: name,
    kind: SymbolKind.alias,
    entity: entity,
    has_children: entity.has_children
  }
}

export function local(name: string, type?: Type): LocalScalar {
  return {
    name: name,
    kind: SymbolKind.local_scalar,
    has_children: false
  }
}

export function localTable(name: string): LocalTable {
  const table = <LocalTable>{
    name: name,
    kind: SymbolKind.local_table,
    has_children: true,
    children: new NameTable()
  }

  return table
}

// todo: more default types, and some way to
// specify stuff.
// export const INT = type('int')
// export const BIGINT = type('bigint')
// export const BIT = type('bit')
// export const VARCHAR = type('varchar')
// export const DATETIME = type('datetime')
// export const DATE = type('date')

// this scope should never get discarded.
let global: Scope
export function createGlobalScope(): Scope {

  if (global) {
    return global
  }

  const scope = new Scope(undefined, 'global')

  return global = scope
}

function resolveExpr(expr: Expr): any {
  // todo: return some kind of resolved expr...
  // no idea what this should look like
}

function mapColumns(cols: CreateTableElement[]) {
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

// function resolveExpr(scope: Scope, expr: Expr) {

// }

function resolveIdentifier(scope: Scope, ident: Identifier) {
  const first = ident.parts[0]
  let sym = scope.resolve(first)

  if (!sym) {
    throw Error('undefined symbol: ' + first)
  }

  if (ident.parts.length === 1) {
    ident.entity = sym
    return
  }

  for (let i = 1; i < ident.parts.length; i++) {
    const element = ident.parts[i]

    sym = sym.children!.get(element)

    if (!sym) {
      throw Error('undefined symbol: ' + element)
    }
  }
}

// todo: for now we won't actually attempt to resolve type symbols
// just because it's not really "REQUIRED" unless we want to do something
// super super fancy.
export function resolveAll(nodes: SyntaxNode[], scope: Scope) {
  // todo: GET global scope?
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
          // scope.define(localTable(name, mapColumns(t.body))
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

              const e = <IdentifierExpression>src.expr
              resolveIdentifier(scope, e.identifier)

              if (src.alias) {
                selectScope.define(
                  alias(last(src.alias.parts), e.identifier.entity)
                )
               }

              break
            }

            // const resolved = resolveExpr(selectScope, src.expr)

            if (src.alias) {
              // selectScope.define(
              //   alias(last(src.alias.parts), resolved))
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
