import {
  Scanner,
  Token,
  EmptyToken,
  TokenFlags
} from './scanner'

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
  ExecuteProcedureStatement,
  CreateStatement,
  CreateTableStatement,
  ColumnDefinition,
  ComputedColumnDefinition,
  UnaryMinusExpression,
  UnaryPlusExpression,
  LogicalNotExpression,
  IsNullTestExpression,
  CreateProcedureStatement,
  StatementBlock,
  Statement,
  PrintStatement,
  IfStatement,
  CreateViewStatement,
  WhileStatement,
  DefineLabelStatement,
  SearchedCaseExpression,
  WhenExpression,
  SimpleCaseExpression,
  TruncateTableStatement,
  DropStatement,
  InsertIntoStatement,
  CastExpression,
  ColumnDefinitionFlags,
  IdentityDefinition,
  JoinedTable,
  JoinType,
  ExecuteStatementFlags,
  ExecuteStringStatement,
  TableLikeDataSource,
  ParserOptions
} from './ast'

/**
 * reserved words that can be used as functions...
 * @param kind the kind of the token
 */
function isLegalFunctionName(kind: SyntaxKind) {
  return kind === SyntaxKind.left_keyword
    || kind === SyntaxKind.right_keyword
}

function isLocal(ident: Token) {
  // todo: starts with @ or [@ or "@
  // todo: maybe a flag in the scanner...
  const val = <string>ident.value

  return val[0] === '@'
}

function isLiteral(token: Token) {
  const kind = token.kind
  return kind === SyntaxKind.null_keyword
    || kind === SyntaxKind.numeric_literal
    || kind === SyntaxKind.string_literal
}

function isDroppableKeyword(t: Token) {
  if (t.flags & TokenFlags.Keyword) {

    switch (t.kind) {
      case SyntaxKind.table_keyword:
      case SyntaxKind.procedure_keyword:
      case SyntaxKind.view_keyword:
      case SyntaxKind.function_keyword:
      case SyntaxKind.database_keyword:
      case SyntaxKind.schema_keyword:
      case SyntaxKind.index_keyword:
        return true

      // todo: pretty broken, there are like 100
      // object types that can be dropped.
      default: return false
    }
  }

  return false
}

function isCast(ident: Identifier) {
  return ident.parts.length === 0
    && ident.parts[0] === 'cast'
}

export class Parser {
  private readonly options: ParserOptions
  private readonly scanner: Scanner
  // todo: error recovery, right now any error kills the parser.
  // private errors: Array<ParserError> = []
  private token: Token = EmptyToken
  // todo: capture trivia
  private leadingTriviaBuffer: Array<Token> = []
  private trailingTriviaBuffer: Array<Token> = []
  private keywords: Array<Token> = []

  constructor(script: string, info?: any) {
    this.options = Object.assign({ skipTrivia: true }, info)
    this.scanner = new Scanner(script, this.options)
  }

  /**
   * Try to parse the next statement in the list, return undefined if we
   * don't find the start of a valid statement.
   */
  private parseStatement(): Statement | undefined {
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
        break
      }

      case SyntaxKind.drop_keyword: {
        return this.parseDropStatement()
      }

      case SyntaxKind.truncate_keyword: {
        const truncate = <TruncateTableStatement>this.createAndMoveNext(this.token, SyntaxKind.truncate_table_statement)
        this.expect(SyntaxKind.table_keyword)
        truncate.table = this.parseIdentifier()
        return truncate
      }

      case SyntaxKind.delete_keyword: {
        this.error('not implemented')
        break
      }

      case SyntaxKind.print_keyword: {
        const print = <PrintStatement>this.createAndMoveNext(this.token, SyntaxKind.print_statement)
        print.expression = this.tryParseAddExpr()
        return print
      }

      case SyntaxKind.throw_keyword: {
        this.error('not implemented')
        break
      }

      case SyntaxKind.if_keyword: {
        const _if = <IfStatement>this.createAndMoveNext(this.token, SyntaxKind.if_statement)
        _if.predicate = this.tryParseOrExpr()
        _if.then = this.parseStatementBlock()

        if (this.optional(SyntaxKind.else_keyword)) {
          _if.else = this.parseStatementBlock()
        }
        return _if
      }

      case SyntaxKind.while_keyword: {
        const _while = <WhileStatement>this.createAndMoveNext(this.token, SyntaxKind.while_statement)
        _while.predicate = this.tryParseOrExpr()
        _while.body = this.parseStatementBlock()
        return _while
      }

      case SyntaxKind.goto_keyword: {
        this.error('not implemented')
        break
      }

      case SyntaxKind.identifier: {
        const start = this.token
        const ident = this.parseIdentifier()

        // could be a naked procedure call OR a goto label
        if (this.match(SyntaxKind.colon_token)) {
          const label = <DefineLabelStatement>this.createNode(start, SyntaxKind.define_label_statement)
          label.name = ident.parts[0]

          this.moveNext()
          return label
        } else {
          // procedure call with no exec keyword
          const call = <ExecuteProcedureStatement>this.createNode(this.token, SyntaxKind.execute_procedure_statement)

          call.flags |= ExecuteStatementFlags.NoExecKeyword
          call.procedure = ident

          this.finishExecuteProcedureStatement(call)
        }

        // else it's an execute STATEMENT
        break
      }

      // TODO: cursor stuff
      case SyntaxKind.fetch_keyword:
      case SyntaxKind.open_keyword:
      case SyntaxKind.close_keyword:
      case SyntaxKind.deallocate_keyword: {
        this.error('not implemented')
        break
      }

      // TODO: transaction stuff
      case SyntaxKind.begin_keyword:
      case SyntaxKind.commit_keyword:
      case SyntaxKind.rollback_keyword: {
        this.error('not implemented')
      }
    }
  }

  private match(kind: SyntaxKind) {
    return this.token.kind === kind
  }

  private error(message: string) {
    const line = this.scanner!.lineOf(this.token.start)
    const col = this.scanner!.offsetOf(this.token.start, line)
    const text = this.scanner!.getSourceLine(line)
    const err =  this.options.error

    if (err) {
      err({
        file: this.options.path,
        line: line,
        col: col,
        message: message
      })
    } else {
      throw new Error(`${this.options.path} (${line + 1}, ${col + 1}) ${message} \n${text}`)
    }
  }

  private isTrivia() {
    return this.token.kind === SyntaxKind.whitespace
      || this.token.kind === SyntaxKind.comment_block
      || this.token.kind === SyntaxKind.comment_inline
  }

  private finishExecuteProcedureStatement(call: ExecuteProcedureStatement) {
    this.moveNext()

    // this guy doesn't have a good terminal
    const terminate = this.match(SyntaxKind.EOF)
      || this.token.flags & TokenFlags.Keyword
      || this.match(SyntaxKind.semicolon_token)

    if (!terminate) {
      call.flags |= ExecuteStatementFlags.HasArgs
      call.arguments = []
      do {
        // todo: @param = <expr>
        call.arguments.push(this.tryParseAddExpr())
      } while (this.optional(SyntaxKind.comma_token))
    }

    // todo: with recompile
    this.optional(SyntaxKind.semicolon_token)
  }

  private moveNext(): Token {

    this.token = this.scanner!.scan()

    // todo: this could capture leading and trailing trivia
    // but for now it straight up ignores it.
    while (this.isTrivia()) {
      this.token = this.scanner!.scan()
    }

    if (this.token.flags & TokenFlags.Keyword) {
      this.keywords.push(this.token)
    }

    return this.token
  }

  private parseColumnDefinitionList(isCreateTable = false) {
    const cols = []

    do {

      const start = this.token

      if (isCreateTable) {
        // todo: other stuff that's legal inside acreate table
        if (this.match(SyntaxKind.index_keyword)) { }

        if (this.match(SyntaxKind.constraint_keyword)) { }
      }

      const name = this.parseIdentifier()

      if (this.match(SyntaxKind.as_keyword)) {
        const kind = SyntaxKind.computed_column_definition
        const col = <ComputedColumnDefinition>this.createNode(start, kind)

        col.name = name
        this.moveNext()

        col.expression = this.tryParseAddExpr()
        cols.push(col)
      } else {
        const col = <ColumnDefinition>this.createNode(start, SyntaxKind.column_definition)
        col.name = name
        col.type = this.parseType()

        do {
          // column_def optionals
          // todo: ensure that these aren't double specified

          // identity: todo: extract
          // --------
          if (this.match(SyntaxKind.identity_keyword)) {

            col.identity = <IdentityDefinition>this.createAndMoveNext(this.token, SyntaxKind.identity_definition)

            if (col.column_flags & ColumnDefinitionFlags.HasIdentity) {
              this.error('identity cannot be specified more than once')
            }

            col.column_flags |= ColumnDefinitionFlags.HasIdentity

            if (this.optional(SyntaxKind.openParen)) {
              // todo: seed, increment stuff
              col.identity.seed = this.expect(SyntaxKind.numeric_literal).value
              this.expect(SyntaxKind.comma_token)
              col.identity.increment = this.expect(SyntaxKind.numeric_literal).value

              this.expect(SyntaxKind.closeParen)
            }
          }

          // collate
          // -------
          col.collation = this.tryParseCollation()

          if (col.collation) {
            col.column_flags |= ColumnDefinitionFlags.HasCollation
          }

          // not null / not for replication
          // ------------------------------
          const not = this.optional(SyntaxKind.not_keyword)

          // todo: not for replication
          if (this.optional(SyntaxKind.null_keyword)) {
            if (col.column_flags & ColumnDefinitionFlags.HasNullability) {
              this.error('null / not null cannot be specified more than once')
            }

            col.nullability = not ? 'not-null' : 'null'
            col.column_flags |= ColumnDefinitionFlags.HasNullability
          }

          // default(expr)
          // -------------
          if (this.optional(SyntaxKind.default_keyword)) {
            col.default = this.tryParseAddExpr()
          }
        }
        while (!(this.match(SyntaxKind.comma_token) || this.match(SyntaxKind.closeParen)))

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
      const col = <ColumnExpression>this.createNode(start, SyntaxKind.column_expr)
      // todo: if it's an @local = expr that should get a different type as well.
      if (expr.kind === SyntaxKind.identifier_expr && this.match(SyntaxKind.equal)) {
        const identifier = <IdentifierExpression>expr
        this.moveNext()
        col.style = 'alias_equals_expr'
        col.alias = identifier.identifier
        col.expression = this.tryParseAddExpr()

        columns.push(col)
      } else {
        col.expression = expr
        col.style = 'expr_only'

        this.optional(SyntaxKind.as_keyword)

        if (this.match(SyntaxKind.identifier)) {
          col.style = 'expr_as_alias'
          col.alias = this.parseIdentifier()
        }

        columns.push(col)
      }
    } while (this.optional(SyntaxKind.comma_token))

    return columns
  }

  // todo: parse this for createtable
  private tryParseCollation(): CollateNode | undefined {
    if (this.match(SyntaxKind.collate_keyword)) {
      const collate = <CollateNode>this.createAndMoveNext(this.token, SyntaxKind.column_collation)
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
    const statement = <DeclareStatement>this.createAndMoveNext(this.token, SyntaxKind.declare_statement)
    const local = this.expect(SyntaxKind.identifier)

    if (!isLocal(local)) {
      this.error('expected local variable, saw ' + local.value)
    }

    const decl = <VariableDeclaration>{
      name: local.value
    }

    this.optional(SyntaxKind.as_keyword)

    if (this.token.kind === SyntaxKind.table_keyword) {
      const table = <TableDeclaration>this.createAndMoveNext(this.token, SyntaxKind.table_variable_decl)
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

  private makeBinaryExpr(left: Expr, parse: Function): any {
    // todo: fix up the binary expr so that the start/end offsets are right.
    const kind = this.token.kind
    const start = this.token.start
    const end = this.token.end

    this.moveNext()

    const binary = <BinaryExpression>{
      kind: SyntaxKind.binary_expr,
      left: left,
      op: {
        start: start,
        end: end,
        kind: kind
      },
      right: parse.apply(this)
    }

    binary.start = binary.left.start
    binary.end = binary.right.end

    return binary
  }

  private createAndMoveNext(token: Token, kind: SyntaxKind): SyntaxNode {
    const node = this.createNode(token, kind)
    this.moveNext()
    return node
  }

  private createNode(token: Token, kind?: SyntaxKind): SyntaxNode {
    return {
      start: token.start,
      end: token.end,
      kind: kind || token.kind
    }
  }

  // asserts that the current token matches the specified kind
  // moves next, and returns the previous token.
  private expect(kind: SyntaxKind) {
    const token = this.token
    this.assertKind(kind)
    this.moveNext()
    return token
  }

  private assertKind(kind: SyntaxKind) {
    if (this.token.kind !== kind) {
      this.error('Expected ' + SyntaxKind[kind] + ' but found ' + SyntaxKind[this.token.kind])
    }
  }

  private optional(kind: SyntaxKind) {
    if (this.token.kind === kind) {
      this.moveNext()
      return true
    }
    return false
  }

  private parseGo() {
    const statement = <GoStatement>this.createAndMoveNext(this.token, SyntaxKind.go_statement)

    if (this.match(SyntaxKind.numeric_literal)) {
      statement.count = this.token.value
      this.moveNext()
    }

    return statement
  }

  private parseSetStatement() {

    const set = this.token
    const node = this.createAndMoveNext(set, SyntaxKind.set_statement)
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

      if (!this.match(SyntaxKind.on_keyword) && !this.match(SyntaxKind.off_keyword)) {
        this.error('Expected "ON" or "OFF", found ' + SyntaxKind[this.token.kind])
      }

      this.moveNext()

      statement.option_value = this.token
    }

    this.optional(SyntaxKind.semicolon_token)

    return statement
  }

  // operator precedence docs are strange, mul binds tighter than unary minus
  // that doesn't seem right... so I did it the way that makes sense.
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
      const not = <LogicalNotExpression>this.createAndMoveNext(this.token, SyntaxKind.logical_not_expr)
      not.expr = this.tryParseComparisonExpr()
      return not
    }

    return this.tryParseComparisonExpr()
  }

  private makeNullTest(left: Expr) {
    const is = <IsNullTestExpression>this.createAndMoveNext(this.token, SyntaxKind.null_test_expr)
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

  private tryParseAddExpr(): Expr {
    let expr = this.tryParseMultiplicationExpr()
    while (this.isAddPrecedence()) {
      expr = this.makeBinaryExpr(expr, this.tryParseMultiplicationExpr)
    }

    return expr
  }

  private tryParseMultiplicationExpr(): Expr {
    let expr = this.parseBaseExpr()

    while (this.isMultiplyPrecedence()) {
      expr = this.makeBinaryExpr(expr, this.parseBaseExpr)
    }

    return expr
  }

  // advances to next token
  private createSinglePartIdentifier(token: Token) {
    const ident = <Identifier>this.createAndMoveNext(token, SyntaxKind.identifier)
    ident.parts = [
      token.value
    ]
    return ident
  }

  private parseIdentifier(): Identifier {
    this.assertKind(SyntaxKind.identifier)

    const ident = this.createSinglePartIdentifier(this.token)

    while (this.optional(SyntaxKind.dot_token)) {
      if (this.optional(SyntaxKind.mul_token)) {
        // todo: this should probably also end the identifier
        ident.parts.push('*')
        ident.end = this.token.end

        // todo: if there's a dot throw an error
        // foo.a.* is legal, foo.*.a is not
      } else {
        // expect will advance to the next token
        const partial = this.expect(SyntaxKind.identifier)
        ident.parts.push(partial.value)
        ident.end = partial.end
      }
    }

    // todo: maybe also intern the identifier for easy lookup?
    // maybe allowing us to resolve them to the same ident or something
    return ident
  }

  private tryParseUnaryExpr() {
    if (this.token.kind === SyntaxKind.minus_token) {
      const neg = <UnaryMinusExpression>this.createAndMoveNext(this.token, SyntaxKind.unary_minus_expr)
      neg.expr = this.parseBaseExpr()
      neg.end = neg.expr.end
      return neg
    }

    if (this.token.kind === SyntaxKind.plus_token) {
      const pos = <UnaryPlusExpression>this.createAndMoveNext(this.token, SyntaxKind.unary_plus_expr)
      pos.expr = this.parseBaseExpr()
      pos.end = pos.expr.end
      return pos
    }

    if (this.token.kind === SyntaxKind.bitwise_not_token) {
      const not = <BitwiseNotExpression>this.createAndMoveNext(this.token, SyntaxKind.bitwise_not_expr)
      not.expr = this.parseBaseExpr()
      not.end = not.expr.end
      return not
    }
  }

  //  precedence sort of bottoms out here.
  private parseBaseExpr(): Expr {
    const unary = this.tryParseUnaryExpr()

    if (unary) {
      return unary
    }

    if (isLiteral(this.token)) {
      const literal = <LiteralExpression>this.createNode(this.token, SyntaxKind.literal_expr)
      literal.value = this.token.value
      this.moveNext()
      return literal
    }

    if (this.match(SyntaxKind.openParen)) {
      // todo: 'in' context? would allow for multiple comma-separated
      // exprs... do they have to be constant?
      const expr = <ParenExpression>this.createAndMoveNext(this.token, SyntaxKind.paren_expr)
      expr.expression = this.tryParseOrExpr()
      expr.end = this.token.end
      this.expect(SyntaxKind.closeParen)
      return expr
    }

    const start = this.token

    if (this.match(SyntaxKind.mul_token)) {
      // todo: this is really only legal in a few places...
      // select, group by, having
      // maybe set up a context or something
      const ident = this.createSinglePartIdentifier(this.token)
      const expr = <IdentifierExpression>this.createNode(start, SyntaxKind.identifier_expr)
      expr.identifier = ident

      return expr
    }

    // a case expression
    if (this.token.kind === SyntaxKind.case_keyword) {
      return this.parseCaseExpression()
    }

    let ident = undefined
    if (this.match(SyntaxKind.identifier)) {
      ident = this.parseIdentifier()
    }

    if (isLegalFunctionName(this.token.kind)) {
      ident = this.createSinglePartIdentifier(this.token)

      // MUST be used immediately as a function
      this.assertKind(SyntaxKind.openParen)
    }

    if (ident) {
      // special syntax
      // cast(@x as SomeType)
      if (isCast(ident)) {
        const expr = <CastExpression>this.createAndMoveNext(start, SyntaxKind.cast_expr)
        this.expect(SyntaxKind.openParen)
        expr.expr = this.tryParseAddExpr()

        // as
        this.expect(SyntaxKind.as_keyword)
        expr.type = this.parseType()
        expr.end = this.token.end
        this.expect(SyntaxKind.closeParen)
        return expr
      }

      // some other general func with arguments
      if (this.match(SyntaxKind.openParen)) {
        const expr = <FunctionCallExpression>this.createAndMoveNext(start, SyntaxKind.function_call_expr)
        expr.arguments = []
        expr.name = ident

        if (!this.match(SyntaxKind.closeParen)) {
          do {
            // collect all function arg expressions
            expr.arguments.push(this.tryParseAddExpr())
          } while (this.optional(SyntaxKind.comma_token))
        }

        expr.end = this.token.end
        this.expect(SyntaxKind.closeParen)
        return expr
      } else {
        // just a standalone ident expr
        // todo: should this move next?
        const expr = <IdentifierExpression>this.createNode(start, SyntaxKind.identifier_expr)
        expr.identifier = ident
        expr.end = ident.end
        return expr
      }
    }

    this.error(SyntaxKind[this.token.kind] + ' cannot start an expr')
    return <Expr>this.createNode(this.token)
  }

  private tryParseTableOrFunctionExpression() {
    const start = this.token
    const ident = this.parseIdentifier()

    // some other general func with arguments
    if (this.match(SyntaxKind.openParen)) {
      const expr = <FunctionCallExpression>this.createAndMoveNext(start, SyntaxKind.function_call_expr)
      expr.arguments = []
      expr.name = ident

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
      return expr
    }
  }

  private parseWhenExpressionList(expr: CaseExpression, when: () => Expr) {
    do {
      const element = <WhenExpression>this.createAndMoveNext(this.token, SyntaxKind.when_expr)

      element.when = this.tryParseOrExpr()

      this.expect(SyntaxKind.then_keyword)
      element.then = when.apply(this)

      expr.cases.push(element)
    } while (this.match(SyntaxKind.when_keyword))

    if (this.optional(SyntaxKind.else_keyword)) {
      expr.else = this.tryParseAddExpr()
    }

    this.expect(SyntaxKind.end_keyword)
  }

  private parseCaseExpression() {
    const expr = <CaseExpression>this.createAndMoveNext(this.token, SyntaxKind.searched_case_expr)

    // init the cases for both objects
    expr.cases = []

    if (this.match(SyntaxKind.when_keyword)) {
      const searched = <SearchedCaseExpression>expr
      this.parseWhenExpressionList(searched, this.tryParseOrExpr)
    }
    else {
      // these look really similar, however the "simple" only allows arithmetic
      // exprs and below, whereas the searched supports full boolean exprs
      const simple = <SimpleCaseExpression>expr
      simple.kind = SyntaxKind.simple_case_expr
      simple.input_expression = this.tryParseAddExpr()
      this.parseWhenExpressionList(simple, this.tryParseAddExpr)
    }

    return expr
  }

  /**
   * creates a simple assignment operator from the current token
   * but does not call moveNext for you...
   */
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
    const statement = <UseDatabaseStatement>this.createAndMoveNext(
      this.token,
      SyntaxKind.use_database_statement
    )

    const name = this.expect(SyntaxKind.identifier)
    statement.name = name.value

    this.optional(SyntaxKind.semicolon_token)

    return statement
  }

  private parseExecuteStatement(): ExecuteProcedureStatement | ExecuteStringStatement {

    const start = this.token
    this.moveNext()

    if (!isLiteral(this.token)) {
      const kind = SyntaxKind.execute_procedure_statement
      const node = this.createAndMoveNext(this.token, kind)
      const exec = <ExecuteProcedureStatement>node
      exec.procedure = this.parseIdentifier()

      this.finishExecuteProcedureStatement(exec)

      return exec
    }

    const exec_string = <ExecuteStringStatement>this.createAndMoveNext(start, SyntaxKind.execute_string_statement)
    const hasParen = this.optional(SyntaxKind.openParen)

    exec_string.query = this.token.value

    if (this.match(SyntaxKind.comma_token)) {
      exec_string.format_args = []

      do {
        // todo: variable or literals only?
        exec_string.format_args.push(this.tryParseAddExpr())
      } while (this.match(SyntaxKind.comma_token))
    }

    if (hasParen) {
      this.expect(SyntaxKind.closeParen)
    }

    this.optional(SyntaxKind.semicolon_token)

    return exec_string
  }

  private parseCreateStatement(): CreateStatement {
    const start = this.token
    const objectType = this.moveNext()

    switch (objectType.kind) {
      case SyntaxKind.table_keyword: {
        const create = <CreateTableStatement>this.createAndMoveNext(start, SyntaxKind.create_table_statement)

        create.name = this.parseIdentifier()

        this.expect(SyntaxKind.openParen)
        create.body = this.parseColumnDefinitionList()
        this.expect(SyntaxKind.closeParen)

        this.optional(SyntaxKind.semicolon_token)
        return create
      }

      case SyntaxKind.view_keyword: {
        const node = this.createAndMoveNext(start, SyntaxKind.create_view_statement)
        const view = <CreateViewStatement>node

        this.assertKind(SyntaxKind.identifier)

        view.name = this.parseIdentifier()

        this.expect(SyntaxKind.as_keyword)
        view.definition = this.parseSelect()
        this.optional(SyntaxKind.semicolon_token)

        return view
        break
      }

      case SyntaxKind.proc_keyword:
      case SyntaxKind.procedure_keyword: {
        const node = this.createAndMoveNext(start, SyntaxKind.create_proc_statement)
        const procedure = <CreateProcedureStatement>node

        this.assertKind(SyntaxKind.identifier)

        procedure.name = this.parseIdentifier()

        if (!this.match(SyntaxKind.as_keyword)) {
          const parens = this.optional(SyntaxKind.openParen)
          procedure.arguments = this.parseArgumentDeclarationList()
          if (parens) {
            this.expect(SyntaxKind.closeParen)
          }
        }

        this.expect(SyntaxKind.as_keyword)
        procedure.body = this.parseStatementBlock(true)

        return procedure
      }

      case SyntaxKind.index_keyword:
        this.error('"create index" not implemented')
        break
    }

    throw new Error('this should be unreachable')
  }

  private parseStatementBlock(allowMultilineWithoutBeginEnd = false) {
    const block = <StatementBlock>this.createNode(this.token, SyntaxKind.statement_block)
    block.statements = []
    const hasBegin = this.optional(SyntaxKind.begin_keyword)


    // parse the body block
    while (true) {
      if (this.match(SyntaxKind.end_keyword)) {
        if (hasBegin) {
          this.expect(SyntaxKind.end_keyword)
          break
        }

        this.error('Unexpected keyword "end"')

      } else {
        const next = this.parseStatement()
        if (!next) {
          break
        }

        block.statements.push(next)

        if (!hasBegin && !allowMultilineWithoutBeginEnd)
          break
      }
    }

    return block
  }

  private parseArgumentDeclarationList() {
    const args: VariableDeclaration[] = []
    // similar to the scalar decl stuff for locals
    // but there we have to determine that it's NOT a table decl
    // and by then we've already read past the identifier
    do {
      const next = <VariableDeclaration>this.createNode(this.token, SyntaxKind.scalar_variable_decl)

      next.name = this.expect(SyntaxKind.identifier).value
      next.type = this.parseType()

      if (this.optional(SyntaxKind.equal)) {
        next.expression = <ValueExpression>this.tryParseAddExpr()
      }

      args.push(next)
    } while (this.optional(SyntaxKind.comma_token))

    return args
  }

  private parseAlterStatement(): AlterStatement {
    this.error('"Alter" not implemented')
    return <AlterStatement>this.createNode(this.token)
  }

  private parseDropStatement() {
    const statement = <DropStatement>this.createAndMoveNext(this.token, SyntaxKind.drop_statement)

    if (!isDroppableKeyword(this.token)) {
      this.error('incorrect_syntax')
    }

    statement.objectType = this.token

    this.moveNext()
    statement.target = this.parseIdentifier()

    return statement
  }

  private parseInsertStatement(): InsertStatement {
    const statement = <InsertStatement>this.createAndMoveNext(this.token, SyntaxKind.insert_keyword)

    if (this.optional(SyntaxKind.into_keyword)) {
      const into = <InsertIntoStatement>statement
      into.target = this.parseIdentifier()

      if (this.optional(SyntaxKind.openParen)) {
        into.columns = []
        do {
          // kinda hacky
          // just storing the names
          into.columns.push(this.expect(SyntaxKind.identifier).value)
        }
        while (this.optional(SyntaxKind.comma_token))

        this.expect(SyntaxKind.closeParen)
      }

      this.expect(SyntaxKind.values_keyword)

      into.values = []
      this.expect(SyntaxKind.openParen)
      do {
        into.values.push(this.tryParseAddExpr())
      }
      while (this.optional(SyntaxKind.comma_token))

      this.expect(SyntaxKind.closeParen)
    }

    return statement
  }

  private parseSelect() {
    const node = <SelectStatement>this.createAndMoveNext(this.token, SyntaxKind.select_statement)

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
    const from = <FromClause>this.createAndMoveNext(this.token, SyntaxKind.from_clause)

    this.assertKind(SyntaxKind.identifier)

    const source = <TableLikeDataSource>this.createNode(this.token, SyntaxKind.data_source)
    source.expr = this.tryParseTableOrFunctionExpression()

    this.optional(SyntaxKind.as_keyword)

    if (this.match(SyntaxKind.identifier)) {
      source.alias = this.parseIdentifier()
    }

    from.sources = [source]

    // todo: multiple table sources...

    // lots of optional joined tables
    while (true) {
      const join = <JoinedTable>this.createNode(this.token, SyntaxKind.joined_table)
      const isLeft = this.match(SyntaxKind.left_keyword)
      const isRight = this.match(SyntaxKind.right_keyword)

      // todo: cross join
      // todo: full join
      if (isLeft || isRight) {
        join.kind |= isLeft ? JoinType.left : JoinType.right

        this.moveNext()
        this.optional(SyntaxKind.outer_keyword)

        this.assertKind(SyntaxKind.join_keyword)
      } else if (this.optional(SyntaxKind.inner_keyword)) {
        join.type |= JoinType.explicit_inner

        this.assertKind(SyntaxKind.join_keyword)
      } else if (this.match(SyntaxKind.join_keyword)) {
        join.type |= JoinType.implicit_inner
      } else {
        // no joins, done parsing 'from'
        break
      }

      this.moveNext()

      // table expression
      if (this.match(SyntaxKind.openParen)) {
        this.moveNext()

        const join_source = <TableLikeDataSource>this.createNode(this.token, SyntaxKind.data_source)
        join_source.expr = this.parseSelect()

        this.expect(SyntaxKind.closeParen)

        this.optional(SyntaxKind.as_keyword)

        if (this.match(SyntaxKind.identifier)) {
          join_source.alias = this.parseIdentifier()
        }

        join.source = join_source
      } else {
        const join_source = <TableLikeDataSource>this.createNode(this.token, SyntaxKind.data_source)
        join_source.expr = this.tryParseTableOrFunctionExpression()

        this.optional(SyntaxKind.as_keyword)

        if (this.match(SyntaxKind.identifier)) {
          join_source.alias = this.parseIdentifier()
        }

        this.expect(SyntaxKind.on_keyword)
        join.source = join_source
        join.on = this.tryParseOrExpr()
      }

      if (!from.joins) {
        from.joins = []
      }

      from.joins.push(join)
    }

    return from
  }

  private parseWhere() {
    const where = <WhereClause>this.createAndMoveNext(this.token, SyntaxKind.where_clause)
    where.predicate = this.tryParseOrExpr()
    return where
  }

  /**
   * Report all keyword tokens gathered
   */
  getKeywords(): ReadonlyArray<Token> {
    return this.keywords
  }

  /**
   * gets the file, line, column, and text span covering this node,
   * and its children
   */
  getInfo(node: SyntaxNode): any[] {
    const line = this.scanner!.lineOf(node.start)
    const col = this.scanner!.offsetOf(node.start, line)
    const text = this.scanner!.getSourceSubstring(node.start, node.end + 1)

    return [this.options.path, line, col, text]
  }

  /**
   * Parse a given sql string into an array of top level statements and their child expressions.
   *
   * @param script the script to parse.
   * @returns a list of statements within the script.
   */
  parse(): Array<SyntaxNode> {
    const statements: Array<SyntaxNode> = []

    this.moveNext()

    let node = undefined
    while (node = this.parseStatement()) {
      statements.push(node)
    }

    // todo: error recovery?
    if (this.token.kind !== SyntaxKind.EOF) {
      this.error('Unable to parse ' + SyntaxKind[this.token.kind] + ' as a statement. Terminating...')
    }

    return statements
  }
}
