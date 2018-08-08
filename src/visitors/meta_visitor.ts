/**
 * Extracts metadata from a given script for use in diagraming. *
 */
import { Visitor } from './abstract_visitor'
import { CreateProcedureStatement, CreateTableStatement, CreateTableAsSelectStatement, CreateViewStatement, DataSourceKind, TableLikeDataSource, IdentifierExpression, UpdateStatement, DeleteStatement, InsertStatement } from '../ast'
import { formatIdentifier } from '../utils'
import { isTemp } from '../parser'
import { SyntaxKind } from '../syntax'

export interface SqlObject {
  type: 'table' | 'view' | 'procedure'
  name: string
}

export class Metadata {
  public path =  ''
  public create: SqlObject[] = []
  public read: SqlObject[] = []
  public update: SqlObject[] = []
  public delete: SqlObject[] = []
}

// assigns each unique node an id
export function collectNodes(metaStore: Metadata[]) {
  const hash: any = {}
  let id = 0

  for (const meta of metaStore) {
    // is this concat necessary?
    const all = meta.create.concat(
      meta.read,
      meta.update,
      meta.delete
    )

    all.forEach(n => {
      const key = n.name.toLowerCase()
      if (!hash[key]) {
        hash[key] = id++
      }
    })
  }

  return hash
}

export class MetadataVisitor extends Visitor {
  private meta = new Metadata()

  public getAllNodes() {
    // get every target node with their types
  }

  // gets the current metadata
  public getMetadata(path: string) {
    const old = this.meta
    old.path = path

    this.meta = new Metadata()
    return old
  }

  visitCreateProcedure(proc: CreateProcedureStatement) {
    this.meta.create.push({ type: 'procedure', name: formatIdentifier(proc.name) })
  }

  visitCreateTable(table: CreateTableStatement) {
    const name = formatIdentifier(table.name)

    if (!isTemp(name)) {
      this.meta.create.push({
        type: 'table',
        name: name
      })
    }
  }

  visitCreateTableAsSelect(table: CreateTableAsSelectStatement) {
    const name = formatIdentifier(table.name)

    if (!isTemp(name)) {
      this.meta.create.push({
        type: 'table',
        name: name
      })
    }
  }

  visitCreateView(view: CreateViewStatement) {
    this.meta.create.push({
      type: 'view',
      name: formatIdentifier(view.name)
    })
  }

  visitDataSource(source: TableLikeDataSource) {
    // subquery will be picked up later, and I dunno what to do about table-valued-functions
    // just yet, but this will suffice for now.
    if (source.expr.kind === SyntaxKind.identifier_expr) {
      const ident = <IdentifierExpression>source.expr
      const name = formatIdentifier(ident.identifier)

      if (!isTemp(name)) {
        // need semantic model to know for sure
        this.meta.read.push({
          type: 'table',
          name: name
        })
      }
    }
  }

  visitInsertStatement(insert: InsertStatement) {
    const name = formatIdentifier(insert.target)

    if (!isTemp(name)) {
      this.meta.update.push({
        type: 'table',
        name: name
      })
    }
  }

  visitUpdate(update: UpdateStatement) {
    const name = formatIdentifier(update.target)

    // todo: this could be an alias, need semantic model...
    if (!isTemp(name)) {
      this.meta.update.push({
        type: 'table',
        name: name
      })
    }
  }

  // todo: count drop as delete for meta purposes?
  visitDelete(del: DeleteStatement) {
    // todo: this could be an alias, need semantic model...
    const name = formatIdentifier(del.target)

    if (!isTemp(name)) {
      this.meta.delete.push({
        type: 'table',
        name: name
      })
    }
  }
}
