/**
 * Extracts metadata from a given script for use in diagraming. *
 */
import { Visitor } from './abstract_visitor'
import { CreateTableAsSelectStatement, TableLikeDataSource, IdentifierExpression, UpdateStatement, DeleteStatement, InsertStatement, FromClause, Identifier, CreateTableStatement } from '../ast'
import { formatIdentifier, matchIdentifier } from '../utils'
import { isTemp } from '../parser'
import { SyntaxKind } from '../syntax'

export class Metadata {
  public path = ''
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

function findByAlias(from: FromClause, ident: Identifier) {
  for (const t of from.sources) {
    // this should be like the 80% case
    if (matchIdentifier(t.alias, ident)) {
      if (t.expr.kind === SyntaxKind.identifier_expr) {
        const expr = <IdentifierExpression>t.expr

        return formatIdentifier(expr.identifier)
      }

      return undefined
    }
  }
}

export class MetadataVisitor extends Visitor {
  private meta: Metadata

  constructor(
    path: string,
    private includeTemp = false) {

    super()
    this.meta = new Metadata()
    this.meta.path = path
  }

  // gets the current metadata
  public getMetadata() {
    return this.meta
  }

  visitCreateTable(table: CreateTableStatement) {
    if (this.includeTemp || !isTemp(table.name)) {
      const name = formatIdentifier(table.name)
      this.meta.create.push(name)
    }
  }

  visitCtas(table: CreateTableAsSelectStatement) {

    if (this.includeTemp || !isTemp(table.name)) {
      const name = formatIdentifier(table.name)
      this.meta.create.push(name)
    }
  }

  visitDataSource(source: TableLikeDataSource) {
    // subquery will be picked up later, and I dunno what to do about table-valued-functions
    // just yet, but this will suffice for now.
    if (source.expr.kind === SyntaxKind.identifier_expr) {
      const ident = <IdentifierExpression>source.expr

      if (this.includeTemp || !isTemp(ident.identifier)) {
        const name = formatIdentifier(ident.identifier)
        // need semantic model to know for sure
        this.meta.read.push(name)
      }
    }
  }

  visitInsertStatement(insert: InsertStatement) {
    if (this.includeTemp || !isTemp(insert.target)) {
      const name = formatIdentifier(insert.target)

      this.meta.create.push(name)
    }
  }

  visitUpdate(update: UpdateStatement) {

    if (this.includeTemp || !isTemp(update.target)) {
      let name = formatIdentifier(update.target)

      if (update.target.parts.length === 1 && update.from) {
        name = findByAlias(update.from, update.target) || name
      }

      this.meta.update.push(name)
    }
  }

  visitDelete(del: DeleteStatement) {
    if (this.includeTemp || !isTemp(del.target)) {
      let name = formatIdentifier(del.target)

      if (del.target.parts.length === 1 && del.from) {
        name = findByAlias(del.from, del.target) || name
      }

      this.meta.delete.push(name)
    }
  }
}
