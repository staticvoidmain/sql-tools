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
  ConstantExpression,
  LiteralExpression,
  ParenExpression,
  UseDatabaseStatement,
  KeywordNode
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
  private next(): SyntaxNode | undefined {

    switch (this.token.kind) {
      case SyntaxKind.EOF:
        return undefined

      case SyntaxKind.go_keyword:
        return this.parseGo()

      case SyntaxKind.declare_keyword:
        return this.parseVariableDeclarationList()

      case SyntaxKind.set_keyword:
        return this.parseSetStatement()

      case SyntaxKind.use_keyword:
        return this.parseUseDatabase()

      case SyntaxKind.select_keyword:
        return this.parseSelect()

      default:
        this.error('unsupported statement ' + SyntaxKind[this.token.kind])
    }
  }

  private error(err: string) {
    throw {
      message: err,
      line: this.scanner!.lineOf(this.token)
    }
  }

  private moveNext(): Token {
    this.token = this.scanner!.scan()
    if (this.token.kind === SyntaxKind.whitespace) {
      this.token = this.scanner!.scan()
    }
    return this.token
  }

  private parseColumnList(): Array<ColumnNode> {
    return []
  }

  private parseType(): string {
    // todo: this doesn't allow for parens and stuff
    return this.expect(SyntaxKind.identifier).value
  }

  private parseVariableDeclarationList() {
    const statement = <VariableDeclarationStatement>this.createKeyword(this.token)
    statement.declarations = []

    const local = this.expect(SyntaxKind.identifier)

    if (local.value[0] !== '@') {
      this.error('expected local variable, saw ' + local.value)
    }

    const decl = <VariableDeclaration>{
      name: local.value
    }

    if (this.token.kind === SyntaxKind.as_keyword) {
      // todo: KeywordToken?
      decl.as = this.token.value
      this.moveNext()
    }

    if (this.token.kind === SyntaxKind.table_keyword) {
      decl.type = 'table'
      // todo:
      // decl.expression = this.parseTableVariableDecl()
      // DONE
    }
    else {
      decl.type = this.parseType()

      if (this.optional(SyntaxKind.equal)) {
        decl.expression = <ValueExpression>this.tryParseAddExpr()
      }

      statement.declarations.push(decl)

      // todo: optional()
      while (this.optional(SyntaxKind.commaToken)) {
        const next = <VariableDeclaration>{
          name: this.expect(SyntaxKind.identifier).value,
          type: this.parseType()
        }

        if (this.optional(SyntaxKind.equal)) {
          next.expression = <ValueExpression>this.tryParseAddExpr()
        }

        statement.declarations.push(next)
        this.moveNext()
      }
    }

    return statement
  }

  makeBinaryExpr(left: Expr, parse: Function): any {
    // todo: fix up the binary expr so that the start/end offsets are right.
    const kind = this.token.kind
    const start = this.token.start
    const end = this.token.end

    this.moveNext()

    return <BinaryExpression>{
      left: left,
      op: {
        start: start,
        end: end,
        kind: kind
      },
      right: parse.apply(this)
    }
  }

  private createKeyword(token: Token): KeywordNode {
    const node = <KeywordNode>this.createNode(token)
    node.keyword = token

    this.moveNext()
    return node
  }

  private createNode(token: Token): SyntaxNode {
    return {
      start: token.start,
      end: token.end,
      kind: token.kind
    }
  }

  // asserts that the current token matches the specified kind
  // moves next, and returns the previous token.
  private expect(kind: SyntaxKind) {
    const token = this.token
    if (this.token.kind !== kind) {
      this.error('Expected ' + SyntaxKind[kind] + ' but found ' + SyntaxKind[this.token.kind])
    }

    this.moveNext()
    return token
  }

  private optional(kind: SyntaxKind) {
    if (this.token.kind === kind) {
      this.moveNext()
      return true
    }
    return false
  }

  private parseExpected(kind: SyntaxKind, cb: Function) {
    if (this.token.kind === kind) {
      return cb(this.createNode(this.token))
    }
    this.error('Expected ' + SyntaxKind[kind] + ' but found ' + SyntaxKind[this.token.kind])
  }

  private parseOptional(kind: SyntaxKind, cb: Function) {
    if (this.token.kind === kind) {
      return cb(this.createNode(this.token))
    }
  }

  private parseGo(): SyntaxNode {
    const statement = <GoStatement>this.createKeyword(this.token)

    if (this.token.kind === SyntaxKind.numeric_literal) {
      statement.count = this.token.value
      this.moveNext()
    }

    return statement
  }

  private parseSetStatement(): SyntaxNode {
    const statement = <SetStatement>this.createKeyword(this.token)
    const local = this.expect(SyntaxKind.identifier)

    statement.name = local.value
    statement.op = this.parseAssignmentOperation()
    this.moveNext()
    statement.expression = <ValueExpression>this.tryParseAddExpr()

    return statement
  }

  // operator precedence, weird, mul is higher precedence than unary minus?
  /*
    0 unary stuff: parens, literals, case exprs,
    1	~ (Bitwise NOT)
    2	* (Multiplication), / (Division), % (Modulus)
    3	+ (Positive), - (Negative), + (Addition), + (Concatenation), - (Subtraction), & (Bitwise AND), ^ (Bitwise Exclusive OR), | (Bitwise OR)
    4	=, >, <, >=, <=, <>, !=, !>, !< (Comparison operators)
    5	NOT
    6	AND
    7	ALL, ANY, BETWEEN, IN, LIKE, OR, SOME
    8	= (Assignment)
  */
  // IS NOT? hmmm...
  private parseInExpression(left: Expr) {

  }

  private isLiteral() {
    const kind = this.token.kind
    return kind === SyntaxKind.null_keyword
      || kind === SyntaxKind.numeric_literal
      || kind === SyntaxKind.string_literal
  }

  // todo: kinds as integer ranges
  private isOrPrecedence() {
    // todo: more any,all,some,in
    const kind = this.token.kind
    return kind === SyntaxKind.or_keyword
      || kind === SyntaxKind.between_keyword
      || kind === SyntaxKind.like_keyword
  }

  // 3
  private isAddPrecedence() {
    const kind = this.token.kind
    return kind === SyntaxKind.plusToken
      || kind === SyntaxKind.minusToken
      || kind === SyntaxKind.bitwiseAnd
      || kind === SyntaxKind.bitwiseOr
      || kind === SyntaxKind.bitwiseXor
  }

  private isMultiplyPrecedence() {
    const kind = this.token.kind
    return kind === SyntaxKind.mulToken
      || kind === SyntaxKind.divToken
      || kind === SyntaxKind.modToken
  }

  // fallthrough from lowest to highest precedence.
  private tryParseOrExpr(): Expr {
    let expr = this.tryParseAndExpr()

    while (this.isOrPrecedence()) {
      expr = this.makeBinaryExpr(expr, this.tryParseAndExpr)
    }

    return expr
  }

  private tryParseAndExpr(): Expr {
    // todo
    return this.tryParseNotExpr()
  }

  private tryParseNotExpr(): Expr {
    // todo
    return this.tryParseComparisonExpr()
  }

  private tryParseComparisonExpr(): Expr {
    // todo
    return this.tryParseAddExpr()
  }

  // or higher
  private tryParseAddExpr(): Expr {
    let expr = this.tryParseMultiplicationExpr()
    // todo: what do we do about unary negation?
    while (this.isAddPrecedence()) {
      expr = this.makeBinaryExpr(expr, this.tryParseMultiplicationExpr)
    }

    return expr
  }

  private tryParseMultiplicationExpr(): Expr {
    let expr = this.tryParseBitwiseNotExpr()

    while (this.isMultiplyPrecedence()) {
      expr = this.makeBinaryExpr(expr, this.tryParseBitwiseNotExpr)
    }

    return expr
  }

  private tryParseBitwiseNotExpr(): Expr {
    // unary: if the current token isn't a bitwise not... we don't have to do that...
    if (this.token.kind === SyntaxKind.bitwiseNot) {
      // const not = <BitwiseNotExpression>this.createNode(this.token);
      // not.expression = this.exprBase()
      // return not
      this.error('not implemented')
    }

    return this.exprBase()
  }

  private exprBase(): Expr {
    if (this.isLiteral()) {
      const literal = <LiteralExpression>this.createNode(this.token)
      literal.value = this.token.value
      this.moveNext()
      return literal
    }

    if (this.token.kind === SyntaxKind.openParen) {
      const expr = <ParenExpression>this.createNode(this.token)

      this.moveNext()
      expr.expression = this.tryParseOrExpr()

      this.expect(SyntaxKind.closeParen)
      return expr
    }

    // todo: loop while it's a dot or open paren... sheesh this is
    // gonna get complex.
    if (this.token.kind === SyntaxKind.identifier) {
      // todo: readIdentifierRest
      // could be a function call
      this.error('not supported')
    }

    // a case expression...?
    if (this.token.kind === SyntaxKind.case_keyword) {
      this.error('not supported yet')
    }

    // todo: asdf IN (1, 2, 3, 4)
    // nothing else should really behave that way...
    this.error('not supported yet')
    return <Expr>this.createNode(this.token)
  }

  private parseAssignmentOperation(): AssignmentOperator {
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
    const statement = <UseDatabaseStatement>this.createKeyword(this.token)
    const name = this.expect(SyntaxKind.identifier)
    statement.name = name.value

    this.optional(SyntaxKind.semiColonToken)

    return statement
  }

  private parseSelect() {
    const node = <SelectStatement>this.createNode(this.token)

    node.columns = this.parseColumnList()
    // node.into = <IntoClause>this.parseOptional(SyntaxKind.into_expression, this.parseInto)
    // TODO: from is not required.
    node.from = <FromClause>this.parseOptional(SyntaxKind.from_clause, this.parseFrom)
    // node.where = <WhereClause>this.parseOptional(SyntaxKind.where_clause, this.parseWhere)
    // node.group_by = this.parseOptional(SyntaxKind.group_by)
    // node.order_by = this.parseOptional(SyntaxKind.order_by)
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
  parse(script: string, info?: any): Array<SyntaxNode> {
    this.settings = Object.assign({ skipTrivia: true }, info)

    this.scanner = new Scanner(script, this.settings)
    const statements: Array<SyntaxNode> = []

    this.moveNext()

    let node = undefined
    while (node = this.next()) {
      statements.push(node)
    }

    return statements
  }
}
