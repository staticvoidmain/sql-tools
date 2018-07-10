/*

map a SIMPLE sql grammar that accepts
as many kinds of sql specifications as possible

// totally made up AST based on zero CS theory or practical
// knowledge of how parsers and scanners should work. :)
  declare @x int = 11
  if (@x > 10)
  begin
    select *
    from Foo.Bar.Baz
    where Val > @x or Val < @x and Val is not null
  end
  declare_statement
    decls: [
      name: @x
      value: const_expr(number(11))
    ]
  if_statement
    binary_expression
      left: variable(@x)
      op: greater_than
      right: number(10)
    block
      begin_keyword
      expression
        select_statement
          columns: [
            all_columns
          ]
        from_clause
          table_identity
            db: label(Foo)
            schame: label(Bar)
            table: label(Baz)
        where_clause
          keyword: where
          expr: binary_expression
            left: binary_expression
              left:
                binary_expression
              op: or_operator
              right:
                binary_expression

      end_keyword
*/

/*
  TODO:

  // todo: @x between a and b
  // todo: @x like 'foo%'
  // todo: @x is null
  // todo: @x is not null

 */

import {
  SyntaxKind
} from './syntax'
import { Token } from './scanner'

export interface TextRange {
  start: number
  end: number
}

export interface SyntaxNode extends TextRange {
  kind: SyntaxKind
}

// one two or three part name
// not sure if this needs another type.
export interface Identifier extends SyntaxNode {
  parts: string[]
}

export type ColumnNode = ColumnExpression | IdentifierExpression

export interface PlusOperator extends SyntaxNode { kind: SyntaxKind.plus_token }
export interface MinusOperator extends SyntaxNode { kind: SyntaxKind.minus_token }
export interface MultiplyOperator extends SyntaxNode { kind: SyntaxKind.mul_token }
export interface DivideOperator extends SyntaxNode { kind: SyntaxKind.div_token }
export interface BitwiseOrOperator extends SyntaxNode { kind: SyntaxKind.bitwise_or_token }
export interface BitwiseAndOperator extends SyntaxNode { kind: SyntaxKind.bitwise_and_token }


export interface EqualsOperator extends SyntaxNode { kind: SyntaxKind.equal }
export interface NotEqualsOperator extends SyntaxNode { kind: SyntaxKind.notEqual }
export interface OrOperator extends SyntaxNode { kind: SyntaxKind.or_keyword }
export interface AndOperator extends SyntaxNode { kind: SyntaxKind.and_keyword }
export interface GreaterThanOperator extends SyntaxNode { kind: SyntaxKind.greaterThan }
export interface LessThanOperator extends SyntaxNode { kind: SyntaxKind.lessThan }
export interface GreaterThanEqualOperator extends SyntaxNode { kind: SyntaxKind.greaterThanEqual }
export interface LessThanEqualOperator extends SyntaxNode { kind: SyntaxKind.lessThanEqual }
export interface LikeOperator extends SyntaxNode { kind: SyntaxKind.like_keyword }
export interface InOperator extends SyntaxNode { kind: SyntaxKind.in_keyword }
// todo: exists is a weird one...
// export interface ExistsOperator extends SyntaxNode { kind: SyntaxKind.exists_keyword }
export interface NotOperator extends SyntaxNode { kind: SyntaxKind.not_keyword }

export interface DefaultLiteral extends SyntaxNode { kind: SyntaxKind.default_keyword }

export type BinaryOperator =
  | PlusOperator
  | MinusOperator
  | MultiplyOperator
  | DivideOperator
  | EqualsOperator
  | NotEqualsOperator
  | OrOperator
  | AndOperator
  | GreaterThanOperator
  | LessThanOperator
  | GreaterThanEqualOperator
  | LessThanEqualOperator
  | LikeOperator

// overkill?
export interface PlusEqualsOperator extends SyntaxNode { kind: SyntaxKind.plusEqualsAssignment }
export interface MinusEqualsOperator extends SyntaxNode { kind: SyntaxKind.minusEqualsAssignment }
export interface MultiplyEqualsOperator extends SyntaxNode { kind: SyntaxKind.mulEqualsAssignment }
export interface DivEqualsOperator extends SyntaxNode { kind: SyntaxKind.divEqualsAssignment }
export interface ModEqualsOperator extends SyntaxNode { kind: SyntaxKind.modEqualsAssignment }
export interface AndEqualsOperator extends SyntaxNode { kind: SyntaxKind.bitwiseAndAssignment }
export interface XorEqualsOperator extends SyntaxNode { kind: SyntaxKind.bitwiseXorAssignment }
export interface OrEqualsOperator extends SyntaxNode { kind: SyntaxKind.bitwiseOrAssignment }

export type AssignmentOperator =
  | EqualsOperator
  | PlusEqualsOperator
  | MinusEqualsOperator
  | MultiplyEqualsOperator
  | DivEqualsOperator
  | ModEqualsOperator
  | AndEqualsOperator
  | XorEqualsOperator
  | OrEqualsOperator

export interface IdentifierExpression extends Expr {
  kind: SyntaxKind.identifier_expr
  identifier: Identifier
}

// todo: capture the kind
export interface ColumnExpression extends Expr {
  kind: SyntaxKind.column_expr
  expression: Expr
  alias?: Identifier
}

export interface BinaryExpression extends Expr {
  left: Expr
  op: BinaryOperator
  right: Expr
}

export interface BitwiseNotExpression extends Expr {
  kind: SyntaxKind.bitwise_not_expr
  expr: Expr
}

export type ValueExpression =
  | FunctionCallExpression
  | ConstantExpression
  | CaseExpression
  | BinaryExpression
  | BitwiseNotExpression
  | IdentifierExpression
// todo: table expression with select-top 1 some_col
// or just select 1

export interface DataType extends SyntaxNode {
  name: string
  // max 2: precision + scale | length | 'max'
  args: string[] | 'max'
}

// hmmm... this is a little screwy
export interface Expr extends SyntaxNode { }

export interface NullExpression extends SyntaxNode { kind: SyntaxKind.null_keyword }

export type ConstantExpression =
  //   | DefaultLiteral
  | NullExpression
  | LiteralExpression

// todo: make this a type to account for nulls and defaults and all that
// good stuff...
export interface LiteralExpression extends Expr {
  kind: SyntaxKind.literal_expr
  value: any
}

export interface ParenExpression extends Expr {
  kind: SyntaxKind.paren_expr
  expression: Expr
}

export interface CaseExpression extends Expr, KeywordNode {
  kind: SyntaxKind.case_expr
  cases: Array<WhenExpression>
  else: ValueExpression
}

export interface WhenExpression extends Expr, KeywordNode {
  kind: SyntaxKind.when_expr
  when: Expr
  then: ValueExpression
}

export interface FunctionCallExpression extends Expr {
  kind: SyntaxKind.function_call_expr
  name: Identifier
  arguments: Expr[]
}

export interface WhereClause extends KeywordNode {
  predicate: Expr
}

// https://docs.microsoft.com/en-us/sql/t-sql/queries/from-transact-sql?view=sql-server-2017
export enum JoinType {
  left,
  right,
  full,
  inner,
  cross
}

export interface JoinTableClause extends SyntaxNode {
  type: JoinType
  source: DataSource
  on: Expr
}

export interface GroupByClause extends KeywordNode {
  grouping: ValueExpression[]
}

export interface OrderByClause extends KeywordNode {
  ordering: ValueExpression[]
}


export interface HavingClause extends KeywordNode {
  predicate: Expr
}

export interface IntoClause extends KeywordNode {
  target: Identifier
}

export interface Source extends SyntaxNode {
  alias?: string
  with?: string[] // todo: specialized type for table hints
}

// todo: TableLikeObject?
export interface NamedSource extends SyntaxNode {
  // table/view/variable/temp_table
  name: string
}

export type RowValueExpression =
  | DefaultLiteral
  | NullExpression
  | ValueExpression

/**
 * legal in a from clause, apparently.
 * ex: (values (1, 2), (3, 4) ) as Tuple(a, b);
 */
export interface DerivedTable extends KeywordNode {
  expressions: RowValueExpression[]
}

export type DataSource =
  | NamedSource
  | FunctionCallExpression
  | DerivedTable

export interface FromClause extends KeywordNode {
  sources: DataSource[]
}

// statements
// ----------
// these represent the top-level declarations of a script
// which are made up of all the other node types.
export type Statement =
  | SelectStatement
  | SetStatement
  | VariableDeclaration
  | TableDeclaration
  | UseDatabaseStatement

export interface KeywordNode extends SyntaxNode {
  keyword: Token
}

export interface UseDatabaseStatement extends KeywordNode {
  // todo: maybe later actually factor this into
  // something else...
  name: string
}

export interface StatementBlock {
  statements: Statement[]
}

export interface VariableDeclarationStatement extends KeywordNode {
  declarations: TableDeclaration | VariableDeclaration[]
}

export interface TableDeclaration extends SyntaxNode {
  // todo:
}

export interface VariableDeclaration extends SyntaxNode {
  name: string
  as: string
  type: DataType
  expression?: ValueExpression
}

export interface WhileStatement extends KeywordNode {
  kind: SyntaxKind.while_statement
  predicate: Expr
  body: StatementBlock
}

export interface SetStatement extends KeywordNode {
  name: string
  op: AssignmentOperator
  expression: ValueExpression
}

export interface SelectStatement extends KeywordNode {
  top: any
  qualifier: 'all' | 'distinct'
  columns: Array<ColumnNode>
  from?: FromClause
  into?: IntoClause
  joins?: JoinTableClause[]
  where?: WhereClause
  order_by?: OrderByClause
  group_by?: GroupByClause
  having?: HavingClause
}

export interface GoStatement extends KeywordNode {
  count?: number
}

export interface BlockComment extends SyntaxNode { kind: SyntaxKind.comment_block }
export interface InlineComment extends SyntaxNode { kind: SyntaxKind.comment_inline }

export type Comment =
  | BlockComment
  | InlineComment
