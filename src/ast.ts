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
  parent?: Node
}

export interface DottedIdentifier extends Identifier {
  parts: Array<string>
}

export interface Identifier extends SyntaxNode {
  text: string
}

export type ColumnNode = ColumnExpression | NamedColumn

// is quoted?
export interface NamedColumn extends SyntaxNode {
  column: Identifier
  table?: Identifier
  alias?: string
}

export interface PlusOperator extends SyntaxNode { kind: SyntaxKind.plusToken }
export interface MinusOperator extends SyntaxNode { kind: SyntaxKind.minusToken }
export interface MultiplyOperator extends SyntaxNode { kind: SyntaxKind.mulToken }
export interface DivideOperator extends SyntaxNode { kind: SyntaxKind.divToken }
export interface BitwiseOrOperator extends SyntaxNode { kind: SyntaxKind.bitwiseOr }
export interface BitwiseAndOperator extends SyntaxNode { kind: SyntaxKind.bitwiseAnd }


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

export interface ColumnExpression extends Expr {
  expression: Expr
  alias?: string
}

export interface BinaryExpression extends Expr {
  left: Expr
  op: BinaryOperator
  right: Expr
}

export type ValueExpression =
  | FunctionCallExpression
  | ConstantExpression
  | CaseExpression
  | BinaryExpression
// todo: table expression with select-top 1 some_col
// or just select 1

export enum ExprKind {
  Boolean,
  Value
}
// todo: keyword expr?
export interface Expr extends SyntaxNode {
  type: ExprKind
}

export interface NullExpression extends SyntaxNode { kind: SyntaxKind.null_keyword }

export type ConstantExpression =
//   | DefaultLiteral
  | NullExpression
  | LiteralExpression

// todo: make this a type to account for nulls and defaults and all that
// good stuff...
export interface LiteralExpression extends Expr {
  value: any
}

export interface ParenExpression extends Expr {
  kind: SyntaxKind.paren_expr
  expression: Expr
}

export interface CaseExpression extends Expr, KeywordNode {
  cases: Array<WhenExpression>
  else: ValueExpression
}

export interface WhenExpression extends Expr, KeywordNode {
  when: Expr
  then: ValueExpression
}

// function CALL expression?
// it's unary, but it takes arguments...
export interface FunctionCallExpression extends Expr {
  name: string
  arguments: Expr[]
}

export interface WhereClause extends KeywordNode {
  predicate: Expr
}

export interface IntoClause extends KeywordNode {
  target: Identifier
}

export interface Source extends SyntaxNode {
  alias?: string
  with?: string[] // todo: specialized type for this
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

export interface TableDeclaration extends SyntaxNode { }

export interface VariableDeclaration extends SyntaxNode {
  name: string
  as: string
  type: string
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

export interface SelectStatement extends SyntaxNode {
  columns: Array<ColumnNode>
  from?: FromClause
  into?: IntoClause
  where?: WhereClause
  // todo: account for these.
  order_by?: any
  group_by?: any
  having?: any
}

export interface GoStatement extends KeywordNode {
  count?: number
}

export interface BlockComment extends SyntaxNode { kind: SyntaxKind.comment_block }
export interface InlineComment extends SyntaxNode { kind: SyntaxKind.comment_inline }

export type Comment =
  | BlockComment
  | InlineComment
