import { Scanner, Token, EmptyToken, TokenFlags } from './scanner'
import { Chars } from './chars'
import { SyntaxKind } from './syntax'

import {
  SyntaxNode,
  SelectStatement,
  IntoClause,
  FromClause,
  WhereClause,
  CaseExpression,
  DeclareStatement,
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
  BinaryExpression,
  LiteralExpression,
  ParenExpression,
  UseDatabaseStatement,
  KeywordNode,
  BitwiseNotExpression,
  ColumnExpression,
  DataType,
  TableDeclaration,
  Identifier,
  FunctionCallExpression,
  IdentifierExpression,
  CollateNode,
  SetOptionStatement,
  InsertStatement,
  AlterStatement,
  ExecuteStatement,
  CreateStatement,
  CreateTableStatement,
  ColumnDefinition,
  ComputedColumnDefinition,
  UnaryMinusExpression,
  UnaryPlusExpression,
  NamedSource,
  LogicalNotExpression,
  IsNullTestExpression
} from './ast'

export interface ParserError {
  message: string
  line: number
}

function isLocal(ident: Token) {
  // todo: maybe a flag in the scanner...
  return ident.value[0] === '@'
}

// todo: speculative lookahead stuff...
export class Parser {

  private settings: any
  private scanner?: Scanner
  private errors: Array<ParserError> = []
  private token: Token = EmptyToken

  // parse the next statement in the list.
  private next(): SyntaxNode | undefined {

    // todo: print, throw, if, while
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

      case SyntaxKind.exec_keyword:
      case SyntaxKind.execute_keyword: {
        return this.parseExecuteStatement()
      }

      case SyntaxKind.create_keyword: {
        return this.parseCreateStatement()
      }

      case SyntaxKind.alter_keyword: {
        return this.parseAlterStatement()
      }

      case SyntaxKind.insert_keyword: {
        return this.parseInsertStatement()
      }

      case SyntaxKind.update_keyword: {
        this.error('not implemented')
        break
      }

      case SyntaxKind.drop_keyword: {
        this.error('not implemented')
        break
      }

      case SyntaxKind.delete_keyword: {
        this.error('not implemented')
        break
      }

      default: {
        // todo: should this just moveNext and loop back around?
        // that's the lazy-man's error handling right there boyz.
        this.error('unsupported statement ' + SyntaxKind[this.token.kind])
      }
    }
  }

  private match(kind: SyntaxKind) {
    return this.token.kind === kind
  }

  private error(err: string) {
    throw new Error(`${this.settings.path} (${this.scanner!.offsetOf(this.token)}) ${err}`)
  }

  private isTrivia() {
    return this.token.kind === SyntaxKind.whitespace
      || this.token.kind === SyntaxKind.comment_block
      || this.token.kind === SyntaxKind.comment_inline
  }

  private moveNext(): Token {
    // todo: this could capture leading and trailing trivia
    // but for now it straight up ignores it.
    this.token = this.scanner!.scan()
    while (this.isTrivia()) {
      this.token = this.scanner!.scan()
    }
    return this.token
  }

  // todo: come up with a better name for what this is
  private parseColumnDefinitionList() {
    const cols = []

    do {
      // todo: other stuff that's legal inside acreate table
      // constraint foo on (blah) default (0)
      const start = this.token
      const name = this.parseIdentifier()

      if (this.match(SyntaxKind.as_keyword)) {
        const kind = SyntaxKind.computed_column_definition
        const col = <ComputedColumnDefinition>this.createNode(start, kind)

        col.name = name
        col.as_keyword = this.token
        this.moveNext()

        col.expression = this.tryParseAddExpr()
        cols.push(col)
      } else {
        const col = <ColumnDefinition>this.createNode(start)
        col.name = name
        col.type = this.parseType()
        cols.push(col)

      }
    } while (this.optional(SyntaxKind.comma_token))

    return cols
  }

  private parseColumnList(): Array<ColumnNode> {
    const columns: Array<ColumnNode> = []
    do {
      const start = this.token
      const expr = this.tryParseAddExpr()

      if (expr.kind === SyntaxKind.identifier_expr) {
        const identifier = <IdentifierExpression>expr

        if (this.optional(SyntaxKind.equal)) {
          // todo: if it's an @local = expr that should get a different type as well.
          const col = <ColumnExpression>this.createNode(start, SyntaxKind.column_expr)
          col.alias = identifier.identifier
          col.expression = this.tryParseAddExpr()
          col.collation = this.tryParseCollation()

          columns.push(col)
        } else {
          // just push the identifier standalone
          columns.push(identifier)
        }
      } else {

        const col = <ColumnExpression>this.createNode(start, SyntaxKind.column_expr)
        col.expression = expr
        col.collation = this.tryParseCollation()

        if (this.optional(SyntaxKind.as_keyword)) {
          col.alias = this.parseIdentifier()
        }
        else {
          if (this.optional(SyntaxKind.identifier)) {
            col.alias = this.parseIdentifier()
          }
        }

        columns.push(col)
      }

    } while (this.optional(SyntaxKind.comma_token))

    return columns
  }

  private tryParseCollation(): CollateNode | undefined {
    if (this.match(SyntaxKind.collate_keyword)) {
      const collate = <CollateNode>this.createKeyword(this.token, SyntaxKind.column_collation)
      collate.collation = this.parseIdentifier()
      return collate
    }
  }

  private parseType(): DataType {
    const ident = this.expect(SyntaxKind.identifier)
    const type = <DataType>this.createNode(this.token, SyntaxKind.data_type)

    // todo: lookup and canonicalize type?
    // not sure why that would be necessary right now
    // but maybe in the future
    type.name = ident.value
    if (this.match(SyntaxKind.openParen)) {
      this.moveNext()

      if (this.match(SyntaxKind.identifier)) {
        if (this.token.value !== 'max') {
          this.error('illegal identifier in type specification')
        }

        type.args = 'max'
        this.moveNext()
      }
      else {
        type.args = []
        // I think this is actually at most 2...
        while (true) {
          type.args.push(this.expect(SyntaxKind.numeric_literal).value)

          if (this.match(SyntaxKind.comma_token)) {
            this.moveNext()
          } else break
        }
      }

      this.expect(SyntaxKind.closeParen)
    }

    return type
  }

  private parseVariableDeclarationList() {
    const statement = <DeclareStatement>this.createKeyword(this.token, SyntaxKind.declare_statement)
    const local = this.expect(SyntaxKind.identifier)

    if (!isLocal(local)) {
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
      const table = <TableDeclaration>this.createKeyword(this.token, SyntaxKind.table_variable_decl)
      table.name = local.value
      table.body = this.parseColumnDefinitionList()
      statement.table = table
    }
    else {
      decl.kind = SyntaxKind.scalar_variable_decl
      decl.type = this.parseType()

      if (this.optional(SyntaxKind.equal)) {
        decl.expression = <ValueExpression>this.tryParseAddExpr()
      }

      statement.variables = [decl]

      while (this.optional(SyntaxKind.comma_token)) {

        const next = <VariableDeclaration>this.createNode(this.token, SyntaxKind.scalar_variable_decl)

        next.name = this.expect(SyntaxKind.identifier).value
        next.type = this.parseType()

        if (this.optional(SyntaxKind.equal)) {
          next.expression = <ValueExpression>this.tryParseAddExpr()
        }

        statement.variables.push(next)
        this.moveNext()
      }
    }

    // todo: append this as trailing trivia
    this.optional(SyntaxKind.semicolon_token)
    return statement
  }

  makeBinaryExpr(left: Expr, parse: Function): any {
    // todo: fix up the binary expr so that the start/end offsets are right.
    const kind = this.token.kind
    const start = this.token.start
    const end = this.token.end

    this.moveNext()

    return <BinaryExpression>{
      kind: SyntaxKind.binary_expr,
      left: left,
      op: {
        start: start,
        end: end,
        kind: kind
      },
      right: parse.apply(this)
    }
  }

  private createKeyword(token: Token, kind: SyntaxKind): KeywordNode {
    const node = <KeywordNode>this.createNode(token, kind)
    node.keyword = token

    this.moveNext()
    return node
  }

  private createNode(token: Token, kind?: SyntaxKind): SyntaxNode {
    return {
      start: token.start,
      end: token.end,
      kind: kind || token.kind,
      debug: SyntaxKind[kind || token.kind]
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
    const statement = <GoStatement>this.createKeyword(this.token, SyntaxKind.go_statement)

    if (this.match(SyntaxKind.numeric_literal)) {
      statement.count = this.token.value
      this.moveNext()
    }

    return statement
  }

  private parseSetStatement(): SyntaxNode {

    const set = this.token
    const node = this.createKeyword(set, SyntaxKind.set_statement)
    const ident = this.expect(SyntaxKind.identifier)
    let statement: SetStatement | SetOptionStatement

    if (isLocal(ident)) {
      statement = <SetStatement>node
      statement.name = ident.value
      statement.op = this.parseAssignmentOperation()
      this.moveNext()
      statement.expression = <ValueExpression>this.tryParseAddExpr()
    } else {
      statement = <SetOptionStatement>node
      statement.kind = SyntaxKind.set_option_statement
      statement.option = ident
      // on | off
      statement.option_value = this.moveNext()
    }

    this.optional(SyntaxKind.semicolon_token)

    return statement
  }

  // operator precedence, weird, mul is higher precedence than unary minus?
  /*
    0 unary stuff: parens, literals, case exprs, function_call exprs
    1	~ (Bitwise NOT)
    2	* (Multiplication), / (Division), % (Modulus)
    3	+ (Positive), - (Negative), + (Addition), + (Concatenation), - (Subtraction), & (Bitwise AND), ^ (Bitwise Exclusive OR), | (Bitwise OR)
    4	=, >, <, >=, <=, <>, !=, !>, !< (Comparison operators)
    5	NOT
    6	AND
    7	ALL, ANY, BETWEEN, IN, LIKE, OR, SOME
    8	= (Assignment)
  */

  // todo: how do I handle 'is' and 'is not'

  private isLiteral() {
    const kind = this.token.kind
    return kind === SyntaxKind.null_keyword
      || kind === SyntaxKind.numeric_literal
      || kind === SyntaxKind.string_literal
  }

  // 7
  private isOrPrecedence() {
    // todo: more any,all,some,in
    const kind = this.token.kind
    return kind === SyntaxKind.or_keyword
      || kind === SyntaxKind.between_keyword
      || kind === SyntaxKind.like_keyword
  }

  // 6 this.token.kind === SyntaxKind.and_keyword
  // 5 this.token.kind === SyntaxKind.not_keyword

  // 4
  private isComparisonPrecedence() {
    const kind = this.token.kind
    return (kind >= SyntaxKind.equal
      && kind <= SyntaxKind.greaterThanEqual)
      || kind === SyntaxKind.is_keyword
  }

  // 3
  private isAddPrecedence() {
    const kind = this.token.kind
    return kind === SyntaxKind.plus_token
      || kind === SyntaxKind.minus_token
      || kind === SyntaxKind.bitwise_and_token
      || kind === SyntaxKind.bitwise_or_token
      || kind === SyntaxKind.bitwise_xor_token
  }

  // 2
  private isMultiplyPrecedence() {
    const kind = this.token.kind
    return kind === SyntaxKind.mul_token
      || kind === SyntaxKind.div_token
      || kind === SyntaxKind.mod_token
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
    let expr = this.tryParseNotExpr()
    while (this.match(SyntaxKind.and_keyword)) {
      expr = this.makeBinaryExpr(expr, this.tryParseNotExpr)
    }
    return expr
  }

  private tryParseNotExpr(): Expr {
    // todo: this needs more testing I think...
    if (this.match(SyntaxKind.not_keyword)) {
      const not = <LogicalNotExpression>this.createKeyword(this.token, SyntaxKind.logical_not_expr)
      not.expr = this.tryParseComparisonExpr()
      return not
    }

    return this.tryParseComparisonExpr()
  }

  private makeNullTest(left: Expr) {
    // feels weird... and it's probably wrong.
    const is = <IsNullTestExpression>this.createNode(this.token, SyntaxKind.null_test_expr)
    this.moveNext()
    is.expr = left
    is.not_null = this.optional(SyntaxKind.not_keyword)
    this.expect(SyntaxKind.null_keyword)

    return is
  }

  private tryParseComparisonExpr(): Expr {
    let expr = this.tryParseAddExpr()

    while (this.isComparisonPrecedence()) {
      if (this.match(SyntaxKind.is_keyword)) {
        expr = this.makeNullTest(expr)
      } else {
        expr = this.makeBinaryExpr(expr, this.tryParseAddExpr)
      }
    }

    return expr
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
    let expr = this.exprBase()

    while (this.isMultiplyPrecedence()) {
      expr = this.makeBinaryExpr(expr, this.exprBase)
    }

    return expr
  }

  private parseIdentifier(): Identifier {
    // todo: if it's a keyword... we can just bail out. ya?
    const kind = this.token.flags & TokenFlags.Keyword
      ? this.token.kind
      : SyntaxKind.identifier

    const ident = <Identifier>this.createNode(this.token, kind)
    ident.parts = [
      this.token.value
    ]

    this.moveNext()

    while (this.optional(SyntaxKind.dot_token)) {
      // expect will advance to the next token
      ident.parts.push(
        this.expect(SyntaxKind.identifier).value)
    }

    // todo: maybe also intern the identifier for easy lookup?
    // maybe allowing us to resolve them to the same ident or something
    return ident
  }

  private tryParseUnaryExpr() {
    if (this.token.kind === SyntaxKind.minus_token) {
      const neg = <UnaryMinusExpression>this.createNode(this.token, SyntaxKind.unary_minus_expr)
      this.moveNext()
      neg.expr = this.exprBase()
      return neg
    }

    if (this.token.kind === SyntaxKind.plus_token) {
      const pos = <UnaryPlusExpression>this.createNode(this.token, SyntaxKind.unary_plus_expr)
      this.moveNext()
      pos.expr = this.exprBase()
      return pos
    }

    if (this.token.kind === SyntaxKind.bitwise_not_token) {
      const not = <BitwiseNotExpression>this.createNode(this.token, SyntaxKind.bitwise_not_expr)
      this.moveNext()
      not.expr = this.exprBase()
      return not
    }
  }

  //  precedence sort of bottoms out here.
  private exprBase(): Expr {
    const unary = this.tryParseUnaryExpr()

    if (unary) {
      return unary
    }

    if (this.isLiteral()) {
      const literal = <LiteralExpression>this.createNode(this.token, SyntaxKind.literal_expr)
      literal.value = this.token.value
      this.moveNext()
      return literal
    }

    if (this.match(SyntaxKind.openParen)) {
      const expr = <ParenExpression>this.createNode(this.token, SyntaxKind.paren_expr)

      this.moveNext()
      expr.expression = this.tryParseOrExpr()

      this.expect(SyntaxKind.closeParen)
      return expr
    }

    if (this.match(SyntaxKind.identifier)) {
      const start = this.token
      const ident = this.parseIdentifier()

      if (this.match(SyntaxKind.openParen)) {
        const expr = <FunctionCallExpression>this.createNode(start, SyntaxKind.function_call_expr)
        expr.arguments = []
        expr.name = ident

        this.moveNext()
        if (!this.match(SyntaxKind.closeParen)) {
          while (true) {
            expr.arguments.push(this.tryParseAddExpr())

            if (!this.match(SyntaxKind.comma_token)) break
          }
        }

        this.expect(SyntaxKind.closeParen)
        return expr
      } else {
        const expr = <IdentifierExpression>this.createNode(start, SyntaxKind.identifier_expr)
        expr.identifier = ident
        expr.end = this.token.end
        return expr
      }
    }

    // a case expression
    if (this.token.kind === SyntaxKind.case_keyword) {
      this.error('CASE not supported yet')
    }

    // todo: asdf IN (1, 2, 3, 4)
    // nothing else should really behave that way...
    this.error(SyntaxKind[this.token.kind] + ' cannot start an expr')
    return <Expr>this.createNode(this.token)
  }

  // does not call moveNext for you...
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
    const statement = <UseDatabaseStatement>this.createKeyword(this.token, SyntaxKind.use_database_statement)
    const name = this.expect(SyntaxKind.identifier)
    statement.name = name.value

    this.optional(SyntaxKind.semicolon_token)

    return statement
  }

  private parseExecuteStatement(): ExecuteStatement {
    return <ExecuteStatement>this.createNode(this.token,
      SyntaxKind.execute_statement)
  }

  private parseCreateStatement(): CreateStatement {
    const start = this.token
    const objectType = this.moveNext()

    switch (objectType.kind) {
      case SyntaxKind.table_keyword: {
        const create = <CreateTableStatement>this.createKeyword(start, SyntaxKind.create_table_statement)
        create.table_keyword = objectType
        this.expect(SyntaxKind.openParen)
        create.body = this.parseColumnDefinitionList()
        this.expect(SyntaxKind.closeParen)
        break
      }

      case SyntaxKind.view_keyword: {
        this.error('"Create View" not implemented')
        break
      }

      case SyntaxKind.proc_keyword:
      case SyntaxKind.procedure_keyword:
        this.error('"create proc" not implemented')
        break

      case SyntaxKind.index_keyword:
        this.error('"create index" not implemented')
        break
    }

    throw Error('incomplete')
  }

  private parseAlterStatement(): AlterStatement {
    this.error('"Alter" not implemented')
    return <AlterStatement>this.createNode(this.token)
  }

  private parseInsertStatement(): InsertStatement {
    this.error('"Insert" not implemented')
    return <InsertStatement>this.createNode(this.token)
  }

  private parseSelect() {
    const node = <SelectStatement>this.createKeyword(this.token, SyntaxKind.select_statement)

    if (this.optional(SyntaxKind.top_keyword)) {
      node.top = this.expect(SyntaxKind.numeric_literal).value
    }

    if (this.optional(SyntaxKind.distinct_keyword)) {
      node.qualifier = 'distinct'
    }
    else if (this.optional(SyntaxKind.all_keyword)) {
      node.qualifier = 'all'
    }

    node.columns = this.parseColumnList()

    if (this.match(SyntaxKind.into_keyword)) {
      this.error('"into" not implemented')
      node.into = undefined
    }

    if (this.match(SyntaxKind.from_keyword)) {
      node.from = this.parseFrom()
    }

    // odd: where can actually be included without a from
    if (this.match(SyntaxKind.where_keyword)) {
      node.where = this.parseWhere()
    }

    // node.group_by = this.parseOptional(SyntaxKind.group_by)
    // node.order_by = this.parseOptional(SyntaxKind.order_by)
    // node.having = this.parseOptional(SyntaxKind.having_clause)
    // todo: full-text index support????
    // (node.contains freetext etc.)

    return node
  }

  private parseFrom(): FromClause {
    const from = <FromClause>this.createNode(this.token, SyntaxKind.from_clause)
    this.moveNext()

    // super lazy for now.
    // todo: multiple sources, identifiers, functions etc
    if (this.match(SyntaxKind.identifier)) {
      const named = <NamedSource>this.createNode(this.token, SyntaxKind.identifier)
      named.name = this.parseIdentifier()

      if (this.match(SyntaxKind.as_keyword)) {
        named.as_keyword = this.expect(SyntaxKind.as_keyword)
        named.alias = this.parseIdentifier()
      }

      from.sources = [named]
    }

    return from
  }

  private parseWhere() {
    const where = <WhereClause>this.createKeyword(this.token, SyntaxKind.where_clause)
    where.predicate = this.tryParseOrExpr()
    return where
  }

  /**
   * Parse a given sql string into an array of top level statements and their child expressions.
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
