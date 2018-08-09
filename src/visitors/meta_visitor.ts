/**
 * Extracts metadata from a given script for use in diagraming. *
 */
import { Visitor } from './abstract_visitor'
import { CreateTableAsSelectStatement, TableLikeDataSource, IdentifierExpression, UpdateStatement, DeleteStatement, InsertStatement } from '../ast'
import { formatIdentifier } from '../utils'
import { isTemp } from '../parser'
import { SyntaxKind } from '../syntax'

export class Metadata {
  public path =  ''
  public create: string[] = []
  public read: string[] = []
  public update: string[] = []
  public delete: string[] = []
}

// assigns each unique node an id
export function collectNodes(metaStore: Metadata[]) {
  const hash: any = {}
  let id = 1

  for (const meta of metaStore) {
    // is this concat necessary?
    const all = meta.create.concat(
      meta.read,
      meta.update,
      meta.delete
    )

    all.forEach(n => {
      const key = n.toLowerCase()
      if (!hash[key]) {
        hash[key] = id++
      }
    })
  }

  return hash
}

export class MetadataVisitor extends Visitor {
  private meta: Metadata

  constructor(path: string) {
    super()
    this.meta = new Metadata()
    this.meta.path = path
  }

  // gets the current metadata
  public getMetadata() {
    return this.meta
  }

  visitCreateTableAsSelect(table: CreateTableAsSelectStatement) {
    const name = formatIdentifier(table.name)

    if (!isTemp(name)) {
      this.meta.create.push(name)
    }
  }

  visitDataSource(source: TableLikeDataSource) {
    // subquery will be picked up later, and I dunno what to do about table-valued-functions
    // just yet, but this will suffice for now.
    if (source.expr.kind === SyntaxKind.identifier_expr) {
      const ident = <IdentifierExpression>source.expr
      const name = formatIdentifier(ident.identifier)

      if (!isTemp(name)) {
        // need semantic model to know for sure
        this.meta.read.push(name)
      }
    }
  }

  visitInsertStatement(insert: InsertStatement) {
    const name = formatIdentifier(insert.target)

    if (!isTemp(name)) {
      this.meta.create.push(name)
    }
  }

  visitUpdate(update: UpdateStatement) {
    const name = formatIdentifier(update.target)

    // todo: this could be an alias, need semantic model...
    if (!isTemp(name)) {
      this.meta.update.push(name)
    }
  }

  // todo: count drop as delete for meta purposes?
  visitDelete(del: DeleteStatement) {
    // todo: this could be an alias, need semantic model...
    const name = formatIdentifier(del.target)

    if (!isTemp(name)) {
      this.meta.delete.push(name)
    }
  }
}
