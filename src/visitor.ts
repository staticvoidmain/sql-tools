import { SyntaxNode, SelectStatement, KeywordNode } from './ast'
import { SyntaxKind } from './syntax'
import { Token } from './scanner'

export class Visitor {
  visit(node: SyntaxNode) {
    switch (node.kind) {
      case SyntaxKind.select_statement:
        const select = <SelectStatement>node
        this.visitKeyword(select.keyword)
        // this.visit(

      default:
        throw 'Not implemented'
    }
  }

  visitKeyword(token: Token): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
}
