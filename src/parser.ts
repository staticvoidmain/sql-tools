// okay, let's keep this on hold for a bit.
// I may have opened myself up to some annoying complications by supporting
// code generation for multiple platforms...
import { Scanner, Token, EmptyToken } from './scanner'
import { Chars } from './chars'
import { SyntaxKind } from './syntax'

import {
  SyntaxNode,
  SelectStatement,
  IntoClause,
  FromClause,
  WhereClause,
  CaseExpression,
  VariableDeclarationStatement,
  VariableDeclaration,
  GoStatement,
  SetStatement,
  AssignmentOperator,
  PlusEqualsOperator,
  MinusEqualsOperator,
  DivEqualsOperator,
  MultiplyEqualsOperator,
  AndEqualsOperator,
  OrEqualsOperator,
  XorEqualsOperator,
  EqualsOperator,
  ValueExpression,
  ColumnNode,
  Expr,
  ExprKind,
  BinaryExpression,
  ConstantExpression
} from './ast'

export interface ParserError {
  message: string
  line: number
}

// todo: speculative lookahead stuff...
export class Parser {
  private settings: any
  private scanner?: Scanner
  private errors: Array<ParserError> = []
  private token: Token = EmptyToken

  // parse the next statement in the list.
  private next(): SyntaxNode {
    // interesting...
    this.token = this.scanner!.scan()

    let node = <SyntaxNode>{}

    switch (this.token.kind) {

      case SyntaxKind.go_keyword:
        return this.parseGo()

      case SyntaxKind.declare_keyword:
        node = this.parseVariableDeclarationList()

      case SyntaxKind.set_keyword:
        return this.parseSetStatement()

      case SyntaxKind.use_keyword:
      // return this.parseUseDatabase()

      case SyntaxKind.select_keyword:
        return this.parseSelect()

      case SyntaxKind.insert_keyword:
      case SyntaxKind.update_keyword:
      case SyntaxKind.create_keyword:
      case SyntaxKind.drop_keyword:

      default:
      // return undefined
    }

    return node
  }

  private error(err: string) {
    this.errors.push({
      // is this gonna work?
      // we don't really support the error "spans",
      // we can just give a single position.
      message: err,
      line: this.scanner!.getCurrentLine()
    })
  }

  private moveNext(): Token {
    return this.token = this.scanner!.scan()
  }

  // parseX functions
  private parseColumnList(): Array<ColumnNode> {
    return []
  }

  private parseVariableDeclarationList() {

    const statement = <VariableDeclarationStatement>this.createNode(this.token)

    this.expect(SyntaxKind.declare_keyword)
    statement.keyword = this.token
    statement.declarations = []

    this.moveNext()

    this.expect(SyntaxKind.local_variable_reference)

    const decl = <VariableDeclaration>{
      name: this.token.value
    }

    this.moveNext()

    if (this.token.kind === SyntaxKind.as_keyword) {
      decl.as = this.token.value
      this.moveNext()
    }

    if (this.token.kind === SyntaxKind.table_keyword) {

      decl.type = 'table'
      // todo:
      // decl.expression = this.parseTableVariableDecl()
    }

    // todo: parseType()
    // todo: parseEqualsExpression
    // todo: , and loop back around.
    return statement

  }

  private createNode(token: Token): SyntaxNode {
    return {
      start: token.start,
      end: token.end,
      kind: token.kind
    }
  }

  private expect(kind: SyntaxKind) {
    if (this.token.kind !== kind) {
      this.error('Expected ' + kind + ' but found ' + this.token.kind)
    }
  }

  private parseExpected(kind: SyntaxKind, cb: Function) {
    if (this.token.kind === kind) {
      return cb(this.createNode(this.token))
    }
    this.error('Expected ' + kind + ' but found ' + this.token.kind)
  }

  private parseOptional(kind: SyntaxKind, cb: Function) {
    if (this.token.kind === kind) {
      return cb(this.createNode(this.token))
    }
  }

  private parseGo(): SyntaxNode {
    const statement = <GoStatement>this.createNode(this.token)

    this.moveNext()

    if (this.token.kind === SyntaxKind.numeric_literal) {
      statement.count = this.token.value
      this.moveNext()
    }

    return statement
  }

  private parseSetStatement(): SyntaxNode {
    const statement = <SetStatement>this.createNode(this.token)
    statement.keyword = this.token

    this.moveNext()

    this.expect(SyntaxKind.local_variable_reference)
    statement.name = this.token.value

    statement.op = this.parseAssignmentOperation()
    statement.expression = this.parseValueExpression()

    return statement
  }

  // todo: distinguish from a where predicate?
  private parseValueExpression(): ValueExpression {
    // todo: this is gonna get fairly complex.

    return <ConstantExpression>this.createNode(this.token)
  }

  // operator precedence, weird, mul is higher precedence than unary minus?
  /*
    1	~ (Bitwise NOT)
    2	* (Multiplication), / (Division), % (Modulus)
    3	+ (Positive), - (Negative), + (Addition), + (Concatenation), - (Subtraction), & (Bitwise AND), ^ (Bitwise Exclusive OR), | (Bitwise OR)
    4	=, >, <, >=, <=, <>, !=, !>, !< (Comparison operators)
    5	NOT
    6	AND
    7	ALL, ANY, BETWEEN, IN, LIKE, OR, SOME
    8	= (Assignment)
  */
  // todo
  private parseInExpression(left: Expr) {

  }

  private isOrPrecedence() {
    // todo: more any,all,some,in
    return this.token.kind === SyntaxKind.or_keyword
      || this.token.kind === SyntaxKind.between_keyword
      || this.token.kind === SyntaxKind.like_keyword
  }

  // fallthrough precedence / recursive descent
  // into all these operator precedences.
  private tryParseOrExpr(): Expr {
    let expr = this.tryParseAndExpr()

    while (this.isOrPrecedence()) {
      // todo: fix this up so the binary expression spans
      // the length of the expr.
      const next = <BinaryExpression>{}
      next.left = expr
      next.op = {
        start: this.token.start,
        end: this.token.end,
        kind: SyntaxKind.or_keyword
      }

      next.right = this.tryParseAndExpr()

      expr = next
    }

    return expr
  }

  private tryParseAndExpr(): Expr {
    return <Expr>this.createNode(this.token)
  }

  private tryParseNotExpr(): Expr {
    return <Expr>this.createNode(this.token)
  }

  private tryParseComparisonExpr(): Expr {
    return <Expr>this.createNode(this.token)
  }

  private tryParseMultiplicationExpr(): Expr {
    return <Expr>this.createNode(this.token)
  }

  private tryParseBitwiseNotExpr(): Expr {
    return <Expr>this.createNode(this.token)
  }

  private exprBase(): Expr {
    // handle things like function calls
    // paren-expressions
    return <Expr>this.createNode(this.token)
  }

  private parseAssignmentOperation(): AssignmentOperator {
    this.moveNext()

    switch (this.token.kind) {
      case SyntaxKind.equal:
        return <EqualsOperator>this.createNode(this.token)

      case SyntaxKind.plusEqualsAssignment:
        return <PlusEqualsOperator>this.createNode(this.token)

      case SyntaxKind.minusEqualsAssignment:
        return <MinusEqualsOperator>this.createNode(this.token)

      case SyntaxKind.divEqualsAssignment:
        return <DivEqualsOperator>this.createNode(this.token)

      case SyntaxKind.mulEqualsAssignment:
        return <MultiplyEqualsOperator>this.createNode(this.token)

      case SyntaxKind.bitwiseAndAssignment:
        return <AndEqualsOperator>this.createNode(this.token)

      case SyntaxKind.bitwiseOrAssignment:
        return <OrEqualsOperator>this.createNode(this.token)

      case SyntaxKind.bitwiseXorAssignment:
        return <XorEqualsOperator>this.createNode(this.token)

      default:
        throw this.error('Expected assignment operator (=, +=, -= etc...)')
    }
  }

  private parseUseDatabase() {
    return undefined
  }

  private parseSelect() {
    const node = <SelectStatement>this.createNode(this.token)

    node.columns = this.parseColumnList()
    // node.into = <IntoClause>this.parseOptional(SyntaxKind.into_expression, this.parseInto)
    node.from = <FromClause>this.parseExpected(SyntaxKind.from_clause, this.parseFrom)
    // node.where = <WhereClause>this.parseOptional(SyntaxKind.where_clause, this.parseWhere)
    // node.group_by = this.parseOptional(SyntaxKind.group_by)
    // node.order_by = this.parseOptional(SyntaxKind.order_by)
    // does having go with the group-by?
    // node.having = this.parseOptional(SyntaxKind.having_clause)
    // todo: full-text index support.
    // node.contains freetext etc.

    return node
  }

  // private parseInto(): IntoClause {
  //   return undefined
  // }

  private parseFrom(): FromClause {
    // todo: createStatement and statement kind.
    const from = <FromClause>this.createNode(this.token)

    return from
  }

  private parseWhere(): WhereClause {
    // broken?
    return <WhereClause>{
      keyword: this.token,
      kind: SyntaxKind.where_clause,
      predicate: this.tryParseOrExpr()
    }
  }

  /**
   * Parse a given sql string into a tree.
   *
   * @param script the script to parse.
   * @returns a list of statements within the script.
   */
  parse(script: string, info: any): Array<SyntaxNode> {
    this.settings = Object.assign({ skipTrivia: true }, info)

    this.scanner = new Scanner(script, this.settings)
    const tree: Array<SyntaxNode> = []

    let node = undefined
    while (node = this.next()) {
      tree.push(node)
    }

    return tree
  }
}
