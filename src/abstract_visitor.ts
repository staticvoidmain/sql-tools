import { SyntaxKind } from './syntax'

import {
  BinaryExpression,
  SelectStatement,
  ColumnExpression,
  BitwiseNotExpression,
  IdentifierExpression,
  LiteralExpression,
  ParenExpression,
  FunctionCallExpression,
  SyntaxNode,
  UnaryMinusExpression,
  UnaryPlusExpression,
  SetStatement,
  DeclareStatement,
  VariableDeclaration,
  DataType,
  FromClause,
  WhereClause,
  IsNullTestExpression,
  TableDeclaration,
  CreateProcedureStatement,
  UseDatabaseStatement,
  PrintStatement,
  IfStatement,
  WhileStatement,
  StatementBlock,
  SearchedCaseExpression,
  WhenExpression,
  SimpleCaseExpression,
  DropStatement,
  JoinedTable,
  TableLikeDataSource,
  InsertStatement,
  Identifier,
  ColumnDefinition,
  ComputedColumnDefinition,
  CreateTableStatement,
  CreateViewStatement,
  SetOptionStatement
} from './ast'

import { Token } from './scanner'

/**
 * This visitor will allow rules to be evaluated simply by extending this base
 * visitor and implementing the required methods.
 */
export abstract class Visitor {
  visitBinaryExpression(node: BinaryExpression): void { }
  visitBitwiseNot(node: BitwiseNotExpression): void { }
  visitBlock(block: StatementBlock): void { }
  visitColumnDefinition(node: ColumnDefinition): void { }
  visitColumnExpression(col: ColumnExpression): void { }
  visitComputedColumnDefinition(node: ComputedColumnDefinition): void { }
  visitCreateProcedure(node: CreateProcedureStatement): void { }
  visitCreateTable(node: CreateTableStatement): void { }
  visitCreateView(node: CreateViewStatement): void { }
  visitDataSource(node: TableLikeDataSource): void { }
  visitDataType(node: DataType): void { }
  visitDeclareLocals(node: DeclareStatement): void { }
  visitDeclareTableVariable(node: DeclareStatement): void { }
  visitDrop(node: DropStatement): void { }
  visitFrom(node: FromClause): void { }
  visitIdentifier(node: Identifier): void { }
  visitIdentifierExpression(node: IdentifierExpression): void { }
  visitIf(node: IfStatement): void { }
  visitInsertStatement(node: InsertStatement): void { }
  visitJoin(node: JoinedTable): void { }
  visitKeyword(token: Token): void { }
  visitLiteralExpression(node: LiteralExpression): void { }
  visitNullTest(node: IsNullTestExpression): void { }
  visitParenExpression(node: ParenExpression): void { }
  visitPrint(print: PrintStatement): void { }
  visitScalar(node: VariableDeclaration): void { }
  visitSearchedCaseExpression(node: SearchedCaseExpression): void { }
  visitSelect(node: SelectStatement): void { }
  visitSet(node: SetStatement): void { }
  visitSetOption(node: SetOptionStatement): void { }
  visitSimpleCaseExpression(node: SimpleCaseExpression): void { }
  visitTableDeclaration(node: TableDeclaration): void { }
  visitUnaryMinus(node: UnaryMinusExpression): void { }
  visitUnaryPlus(node: UnaryPlusExpression): void { }
  visitUseDatabase(use: UseDatabaseStatement): void { }
  visitWhen(node: WhenExpression): void { }
  visitWhere(node: WhereClause): void { }
  visitWhile(node: WhileStatement): void { }

  visit(node: SyntaxNode | undefined) {
    if (!node) { return }

    switch (node.kind) {
      case SyntaxKind.set_option_statement:
      case SyntaxKind.go_statement: {
        break
      }

      case SyntaxKind.use_database_statement: {
        const use = <UseDatabaseStatement>node
        this.visitUseDatabase(use)
        break
      }

      case SyntaxKind.print_statement: {
        const print = <PrintStatement>node

        this.visitPrint(print)
        this.visit(print.expression)
        break
      }

      case SyntaxKind.column_definition: {
        const col = <ColumnDefinition>node
        this.visitColumnDefinition(col)
        this.visit(col.name)
        break
      }

      case SyntaxKind.computed_column_definition: {
        const computed = <ComputedColumnDefinition>node
        this.visitComputedColumnDefinition(computed)
        this.visit(computed.expression)
        this.visit(computed.name)
        break
      }

      case SyntaxKind.column_expr: {
        const col = <ColumnExpression>node
        this.visitColumnExpression(col)
        this.visit(col.expression)
        break
      }

      case SyntaxKind.statement_block: {
        const block = <StatementBlock>node
        this.visitBlock(block)
        block.statements.forEach(s => this.visit(s))
        break
      }

      case SyntaxKind.drop_statement: {
        this.visitDrop(<DropStatement>node)
        break
      }

      case SyntaxKind.create_table_statement: {
        const table = <CreateTableStatement>node
        this.visitCreateTable(table)
        this.visit(table.name)
        break
      }

      case SyntaxKind.create_view_statement: {
        const view = <CreateViewStatement>node
        this.visitCreateView(view)
        this.visit(view.name)
        this.visit(view.definition)
        break
      }

      case SyntaxKind.create_proc_statement: {
        const proc = <CreateProcedureStatement>node

        this.visitCreateProcedure(proc)

        if (proc.arguments) {
          proc.arguments.forEach(a => this.visit(a))
        }

        this.visit(proc.body)
        break
      }

      case SyntaxKind.if_statement: {
        const _if = <IfStatement>node
        this.visitIf(_if)
        this.visit(_if.predicate)
        this.visit(_if.then)
        this.visit(_if.else)
        break
      }

      case SyntaxKind.while_statement: {
        const w = <WhileStatement>node
        this.visitWhile(w)
        this.visit(w.predicate)
        this.visit(w.body)
        break
      }

      case SyntaxKind.select_statement: {
        const select = <SelectStatement>node
        this.visitSelect(select)

        select.columns.forEach(c => {
          this.visit(c)
        })

        this.visit(select.from)
        this.visit(select.where)

        break
      }

      case SyntaxKind.from_clause: {
        const from = <FromClause>node

        this.visitFrom(from)

        from.sources.forEach(s => this.visit(s))

        if (from.joins) {
          from.joins.forEach(n => this.visit(n))
        }
        break
      }

      case SyntaxKind.data_source: {
        const src = <TableLikeDataSource>node
        this.visitDataSource(src)
        this.visit(src.expr)
        break
      }

      case SyntaxKind.joined_table: {
        const join = <JoinedTable>node
        this.visitJoin(join)
        this.visit(join.source)
        this.visit(join.on)
        break
      }

      case SyntaxKind.where_clause: {
        const where = <WhereClause>node
        this.visitWhere(where)
        this.visit(where.predicate)

        break
      }

      case SyntaxKind.when_expr: {
        const when = <WhenExpression>node
        this.visitWhen(when)
        this.visit(when.when)
        this.visit(when.then)

        break
      }

      case SyntaxKind.simple_case_expr: {
        const simple = <SimpleCaseExpression>node

        this.visitSimpleCaseExpression(simple)

        this.visit(simple.input_expression)

        simple.cases.forEach((n) => this.visit(n))
        this.visit(simple.else)
        break
      }

      case SyntaxKind.searched_case_expr: {
        const searched = <SearchedCaseExpression>node
        this.visitSearchedCaseExpression(searched)
        searched.cases.forEach((n) => this.visit(n))
        this.visit(searched.else)
        break
      }

      case SyntaxKind.null_test_expr: {
        const test = <IsNullTestExpression>node
        this.visitNullTest(test)
        this.visit(test.expr)
        break
      }

      case SyntaxKind.identifier_expr: {
        const ident = <IdentifierExpression>node
        this.visitIdentifierExpression(ident)
        break
      }

      case SyntaxKind.literal_expr: {
        const literal = <LiteralExpression>node
        this.visitLiteralExpression(literal)
        break
      }

      case SyntaxKind.binary_expr: {
        // thought: expressions in a divisor slot which are non-literal
        // could cause divide by zero, that might be cool to test for
        const binary = <BinaryExpression>node

        this.visitBinaryExpression(binary)

        this.visit(binary.left)
        this.visit(binary.right)
        break
      }

      case SyntaxKind.bitwise_not_expr: {
        const unary = <BitwiseNotExpression>node
        this.visitBitwiseNot(unary)
        this.visit(unary.expr)

        break
      }

      case SyntaxKind.unary_minus_expr: {
        const unary = <UnaryMinusExpression>node
        this.visitUnaryMinus(unary)
        this.visit(unary.expr)

        break
      }

      case SyntaxKind.unary_plus_expr: {
        const unary = <UnaryPlusExpression>node
        this.visitUnaryPlus(unary)
        this.visit(unary.expr)

        break
      }

      case SyntaxKind.paren_expr: {
        const paren = <ParenExpression>node
        this.visitParenExpression(paren)
        this.visit(paren.expression)
        break
      }

      case SyntaxKind.function_call_expr: {
        const call = <FunctionCallExpression>node

        if (call.arguments) {
          call.arguments.forEach(e => {
            this.visit(e)
          })
        }

        break
      }

      case SyntaxKind.set_option_statement: {
        const set = <SetOptionStatement>node
        this.visitSetOption(set)
        break
      }

      case SyntaxKind.set_statement: {
        const set = <SetStatement>node
        this.visitSet(set)
        this.visit(set.expression)
        break
      }

      case SyntaxKind.data_type: {
        const type = <DataType>node
        this.visitDataType(type)
        break
      }

      case SyntaxKind.scalar_variable_decl: {
        const scalar = <VariableDeclaration>node

        this.visitScalar(scalar)
        this.visit(scalar.type)
        this.visit(scalar.expression)

        break
      }

      case SyntaxKind.table_variable_decl: {
        const table = <TableDeclaration>node
        this.visitTableDeclaration(table)

        table.body.forEach((i) => {
          this.visit(i)
        })

        break
      }

      case SyntaxKind.declare_statement: {
        const declare = <DeclareStatement>node
        if (!declare.table) {

          this.visitDeclareLocals(declare)

          const vars = <VariableDeclaration[]>declare.variables

          if (vars) {
            vars.forEach((n) => this.visit(n))
          }
        } else {
          this.visitDeclareTableVariable(declare)
        }

        break
      }

      case SyntaxKind.insert_statement: {
        const insert = <InsertStatement>node
        this.visitInsertStatement(insert)

        break
      }
    }
  }
}
