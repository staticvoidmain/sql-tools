import { isLetter, isUpper } from './chars'
import {
  SelectStatement,
  SyntaxNode,
  DeclareStatement,
  TableDeclaration,
  ColumnDefinition,
  CreateTableElement,
  Expr,
  ComputedColumnDefinition,
  IdentifierExpression,
  Identifier,
  BinaryExpression,
  UnaryExpression,
  SimpleCaseExpression,
  SearchedCaseExpression,
  FunctionCallExpression,
  ColumnExpression,
  LiteralExpression,
  SetStatement
} from './ast'

import { SyntaxKind } from './syntax'
import { last } from './utils'
import { readFileSync } from 'fs'


/*

some notes:

  - top-level doubly-linked-list, rooted at the "global" or batch scope
  this can be replaced with a "GO" statement.

  [scope #0]

  declare @asdf int;

  // eh... maybe just
  scope.define(local('@asdf', INT))

  - each select introduces a new enclosing scope
  - and pops it off when it completes and all names are resolved

  - define all aliases, databases, schemas, locals,
  - and columns (with position to allow for the 1-base order by 1 stuff.
*/


export enum SymbolFlags {
  None = 0,
  Ambiguous = 1
}

export interface Symbol {
  flags: SymbolFlags
  entity: Entity
}

export enum SymbolKind {
  unknown,
  alias,
  type,
  column,
  database,
  schema,
  query,
  local_scalar,
  local_table,
  table,
  cursor,
  cte,
  temp_table,
  table_expr
}

// not sure what to do with this yet.
interface Type {
  is_numeric: boolean
  is_string: boolean
}

interface Entity {
  name: string
  kind: SymbolKind
  parent?: Entity
  references?: Expr[]
  children?: NameTable

  // todo: there could be multiples...
  name_collision?: Decl
}

type Decl =
  | Alias
  | LocalScalar
  | LocalTable
  | Table // includes temp?
  | Column
  | Schema
  | Database
  | Procedure
  | View
  | CommonTableExpression

interface Alias extends Entity {
  kind: SymbolKind.alias
  // subquery or table alias
  // should be merged when computing
  // entity references
  entity: Entity
}

interface LocalScalar extends Entity {
  type?: Type
}

interface LocalTable extends Entity {
  kind: SymbolKind.local_table
}

interface Query extends Entity {
  kind: SymbolKind.query
}

interface Database extends Entity {
  kind: SymbolKind.database
}

interface Schema extends Entity {
  kind: SymbolKind.schema
}

interface Procedure extends Entity {
  // arguments
}

interface View extends Entity { }

interface CommonTableExpression extends Entity {
  kind: SymbolKind.table_expr
}

interface Table extends Entity {
  kind: SymbolKind.table
}

interface Column extends Entity {
  ordinal: number
  nullable: boolean
  type: string // todo
}

// todo: this scheme COULD run into name collisions.
class NameTable {
  private map: Map<string, Symbol>

  constructor() {
    this.map = new Map<string, Symbol>()
  }

  add(name: string, sym: Symbol) {
    const existing = this.map.get(name)
    if (existing) {
      existing.flags |= SymbolFlags.Ambiguous
      sym.flags |= SymbolFlags.Ambiguous
      return
    }

    this.map.set(name, sym)
  }

  get(name: string) {
    return this.map.get(name)
  }

  all() {
    return this.map.values()
  }
}

const options = {
  strict: false,
  allowShadow: true,
  verifyTypes: false
}

export function configureResolver(
  strict?: boolean,
  allowShadow?: boolean) {

  if (strict !== undefined) options.strict = strict
  if (allowShadow !== undefined) options.allowShadow = allowShadow
}

export function symbol(entity: Entity) {
  return {
    entity: entity,
    flags: SymbolFlags.None
  }
}

export class Scope {
  private symbols = new NameTable()
  private child_scopes: Scope[] = []

  constructor(
    private parent_scope?: Scope,
    private name?: string) {
    if (parent_scope) {
      parent_scope.child_scopes.push(this)
    }
  }

  define(entity: Entity, allow_redefine?: boolean) {

    if (!options.allowShadow) {
      if (this.parent_scope) {
        const sym = this.parent_scope.resolve(entity.name)

        if (sym) {
          // warn('symbol already defined in a parent scope')
        }
      }
    }

    this.symbols.add(entity.name, symbol(entity))

    return entity
  }

  /**
   * Attempts to resolve a name within this scope, or a parent scope
   */
  resolve(name: string): Decl | undefined {
    const sym = this.symbols.get(name)

    if (sym) {
      return sym.entity
    }

    // walk up the scope chain and try to
    // resolve the symbol there.
    if (this.parent_scope) {
      return this.parent_scope.resolve(name)
    }
  }

  createScope(name?: string) {
    return new Scope(this, name)
  }

  // only looks one layer down,
  // the only use-case right now
  // is to work out the database scope
  // from inside the root scope.
  findChild(name: string): Scope | undefined {
    if (this.child_scopes) {
      for (const c of this.child_scopes) {
        if (c.name === name) {
          return c
        }
      }
    }
  }

  // this one is recursive, but short
  // no current use-case, just added
  // for symmetry
  findParent(name: string): Scope | undefined {
    if (this.parent_scope) {
      if (this.parent_scope.name === name) {
        return this.parent_scope
      }

      return this.parent_scope.findParent(name)
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
  }
}

export function schema(name: string): Schema {
  return <Schema>{
    name: name,
    children: new NameTable(),
    kind: SymbolKind.schema,
  }
}

export function table(name: string): Table {

  return <Table>{
    name: name,
    kind: SymbolKind.table,
    children: new NameTable(),
  }
}

export function tableExpression(name: string): CommonTableExpression {

  return <CommonTableExpression>{
    name: name,
    kind: SymbolKind.table_expr,
    children: new NameTable(),
  }
}


export function column(name: string, parent: Table): Column {
  return <Column>{
    name: name,
    type: '_todo_',
    parent: parent,
    nullable: false,
    kind: SymbolKind.column,
    references: [],
    ordinal: 0,
  }
}

export function alias(name: string, entity: Entity): Alias {
  return {
    name: name,
    kind: SymbolKind.alias,
    entity: entity,
    children: entity.children
  }
}

export function local(name: string, type?: Type): LocalScalar {
  return {
    name: name,
    kind: SymbolKind.local_scalar,
  }
}

export function localTable(name: string): LocalTable {
  const table = <LocalTable>{
    name: name,
    kind: SymbolKind.local_table,
    children: new NameTable()
  }

  return table
}

// placeholder entity for an unresolveable symbol
export const UNKNOWN = {
  name: 'unknown',
  kind: SymbolKind.unknown,
  references: new Array<Expr>()
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


function resolveExpr(scope: Scope, expr: Expr) {

  switch (expr.kind) {
    case SyntaxKind.identifier_expr: {
      const ex = <IdentifierExpression>expr
      resolveIdentifier(scope, ex.identifier)
      break
    }

    case SyntaxKind.binary_expr: {
      const binary = <BinaryExpression>expr
      resolveExpr(scope, binary.left)
      resolveExpr(scope, binary.right)
      break
    }

    case SyntaxKind.function_call_expr: {
      const call = <FunctionCallExpression>expr

      if (call.arguments) {
        call.arguments.forEach(arg => resolveExpr(scope, arg))
      }
      break
    }

    case SyntaxKind.unary_plus_expr:
    case SyntaxKind.bitwise_not_expr:
    case SyntaxKind.logical_not_expr:
    case SyntaxKind.null_test_expr:
    case SyntaxKind.unary_minus_expr: {
      const unary = <UnaryExpression>expr

      resolveExpr(scope, unary.expr)
      break
    }

    case SyntaxKind.searched_case_expr: {
      const searched = <SearchedCaseExpression>expr

      searched.cases.forEach(c => {
        resolveExpr(scope, c.when)
        resolveExpr(scope, c.then)
      })

      resolveExpr(scope, searched.else)
      break
    }

    case SyntaxKind.simple_case_expr: {
      const simple = <SimpleCaseExpression>expr
      resolveExpr(scope, simple.input_expression)

      simple.cases.forEach(c => {
        resolveExpr(scope, c.when)
        resolveExpr(scope, c.then)
      })

      resolveExpr(scope, simple.else)
      break
    }
  }
}

function mapColumns(scope: Scope, cols: CreateTableElement[]) {
  const columns = []

  for (const i of cols) {
    if (i.kind === SyntaxKind.computed_column_definition) {
      // todo: resolve expr
      const computed = <ComputedColumnDefinition>i
      columns.push({
        name: computed.name,
        expr: resolveExpr(scope, computed.expression)
      })
    } else if (i.kind === SyntaxKind.column_definition) {
      const column = <ColumnDefinition>i
      // columns.
    }
  }

  return columns
}

function resolveIdentifier(scope: Scope, ident: Identifier): Entity {
  const first = ident.parts[0]
  let entity = scope.resolve(first)

  if (!entity) {
    if (options.strict) {
      throw Error('undefined symbol: ' + first)
    } else {
      return UNKNOWN
    }
  }

  if (ident.parts.length === 1) {
    return ident.entity = entity
  }

  let child
  for (let i = 1; i < ident.parts.length; i++) {
    const element = ident.parts[i]

    if (!entity.children) {
      throw Error(`entity ${ident.parts[i - 1]} has no child elements`)
    }

    child = entity.children!.get(element)

    if (!child) {
      throw Error(`entity ${ident.parts[i - 1]} has no member ${element}`)
    }

    entity = child.entity
  }

  return ident.entity = entity
}

function tryGetColumnNameForDefine(col: ColumnExpression) {
  if (col.alias) {
    return last(col.alias.parts)
  }

  if (col.expression.kind === SyntaxKind.identifier_expr) {
    return last((<IdentifierExpression>col.expression).identifier.parts)
  }

  // todo: what else?
}

function getColumnEntity(col: ColumnExpression) {
  if (col.alias) {
    return col.alias.entity
  }

  if (col.expression.kind === SyntaxKind.identifier_expr) {
    return last((<IdentifierExpression>col.expression).identifier.entity)
  }

  // same question as above?
}

// todo: for now we won't actually attempt to resolve type symbols
// just because it's not really "REQUIRED" unless we want to do something
// super super fancy.
export function resolveAll(nodes: SyntaxNode[], scope: Scope): void {

  let batch = scope.createScope()

  for (const node of nodes) {
    switch (node.kind) {
      case SyntaxKind.go_statement: {
        batch = scope.createScope()
        break
      }

      case SyntaxKind.declare_statement: {
        const decl = <DeclareStatement>node

        if (decl.variables) {
          for (const v of decl.variables) {
            if (v.expression) {
              resolveExpr(batch, v.expression)
            }
            batch.define(local(v.name))
          }
        }
        else {
          const t = <TableDeclaration>decl.table
          const name = t.name.parts[0]
          // scope.define(localTable(name, mapColumns(t.body))
        }

        break
      }

      case SyntaxKind.set_statement: {
        const set = <SetStatement>node
        const decl = batch.resolve(set.name)

        if (!decl) {
          throw Error(`undefined identifier ${set.name}`)
        }

        resolveExpr(batch, set.expression)
        break
      }

      case SyntaxKind.select_statement: {
        const select = <SelectStatement>node
        const selectScope = batch.createScope()

        // PHASE: define

        if (select.ctes) {
          for (const cte of select.ctes) {
            resolveAll([cte.definition], batch)
            const cols = cte.definition.columns
            // todo: error if there are mismatched column counts
            // todo: error if the column types are mismatched

            const anon = selectScope.define(tableExpression(last(cte.name.parts)))

            for (let index = 0; index < cols.length; index++) {
              const col = cols[index]
              const name = cte.columns
                ? last(cte.columns[index].parts)
                : tryGetColumnNameForDefine(col)

              // todo:
              anon.children!.add(name!, getColumnEntity(col))
            }
          }
        }

        if (select.from) {
          for (const src of select.from.sources) {
            if (src.expr.kind === SyntaxKind.identifier_expr) {
              const e = <IdentifierExpression>src.expr
              const entity = resolveIdentifier(batch, e.identifier)

              if (src.alias) {
                selectScope.define(
                  alias(last(src.alias.parts), entity)
                )
              }

              // implicitly define the children,
              // which means we can now have ambiguous names
              if (entity.children) {
                for (const sym of entity.children.all()) {
                  selectScope.define(sym.entity, true)
                }
              }

              break
            }

            // todo: other kinds of sources... like nested selects

            if (src.alias) {
              // todo: this should probably be select_expr
              // but I'd have to rewrite things a bit
              if (src.kind === SyntaxKind.select_statement) {
                // entity = makeTemp(
                break
              }

              if (src.kind === SyntaxKind.function_call_expr) {
                break
              }

              // const entity = {}
              // selectScope.define(
              //   alias(last(src.alias.parts), entity))
            }

            // if ()
          }
        }

        // PHASE: resolve
        for (const col of select.columns) {
          resolveExpr(selectScope, col.expression)
          // todo: add each column to the defined cols of the select as well?
        }

        if (select.where) {
          resolveExpr(selectScope, select.where.predicate)
        }

        // todo: group by and order by support ordinal column lists
        // so, resolveExpr(selectScope, 1) is a fun edge case for future me
        if (select.group_by) {

          for (const expr of select.group_by.grouping) {
            resolveExpr(selectScope, expr)
          }
        }

        if (select.order_by) {
          for (const order of select.order_by.orderings) {
            resolveExpr(selectScope, order.expr)
          }
        }

        break
      }

      case SyntaxKind.create_table_as_select_statement: {
        break
      }

      case SyntaxKind.create_table_statement: {
        break
      }

      case SyntaxKind.update_statement: { break }

      case SyntaxKind.delete_statement: { break }
    }
  }
}

/*
load an environment data structure from some external database schema dump to json
*/

// TODO: to enable "strict" mode, we have to load the
// environment with all the server default identifiers
// like all the datepart shit, built in functions,
// dmvs, blah blah blah.
// so we COULD do that, or... just make the
// undefined symbols resolve to some "any" type
// and get back to it later.
export function loadEnvironment(file: string) {
  const text = readFileSync(file, 'utf8')
  const json = JSON.parse(text)
  const scope = new Scope(undefined, 'root')

  for (const dbName in json.databases) {
    scope.define(database(dbName))

    loadDatabase(
      scope.createScope(dbName),
      json.databases[dbName])
  }

  return scope
}

function loadDatabase(scope: Scope, db: any) {
  for (const schemaName in db.schemas) {
    const s = schema(schemaName)
    const tables = db.schemas[schemaName].tables

    for (const tableName in tables) {
      const t = table(tableName)
      const columns = tables[tableName].columns

      for (const columnName in columns) {
        const entity = column(columnName, t)
        const col = columns[columnName]
        entity.nullable = col.nullable
        entity.type = col.type
        t.children!.add(columnName, symbol(entity))
      }

      t.parent = s
      s.children!.add(tableName, symbol(t))

      // todo: this can be a flag at
      // some point, but for now we'll use the
      // standard default
      if (schemaName === 'dbo') {
        scope.define(t)
      }
    }

    scope.define(s)
  }
}
