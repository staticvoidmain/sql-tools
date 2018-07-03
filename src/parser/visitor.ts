import { SyntaxNode } from './ast';
import { SyntaxKind } from './syntax';

export class Visitor {
  visit(node: SyntaxNode) {
    switch (node.kind) {
      default:
        throw 'Not implemented'
    }
  }
}
