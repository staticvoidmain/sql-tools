// disclaimer: I doubt I'm ever going to support the full mssql grammar
// but maybe someone will send me a PR with "for xml" and all that crap
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

  // todo: remove me
  debug?: string
}

// one two or three part name
// not sure if this needs another type.
export interface Identifier extends SyntaxNode {
  parts: string[]
}

export type ColumnNode = ColumnExpression | IdentifierExpression

// todo: these might not matter... since createNode makes it with the token kind baked in...
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
  identifier: Identifier
}

export interface CollateNode extends KeywordNode {
  collation: Identifier
}

export type CreateTableElement =
| ColumnDefinition
| ComputedColumnDefinition
| ConstraintDefinition
// todo: ... lots more here

export interface ColumnDefinition extends SyntaxNode {
  name: Identifier
  type: DataType
  not_keyword?: Token
  null_keyword?: Token
  default_keyword?: Token
}

export interface ComputedColumnDefinition extends SyntaxNode {
  name: Identifier
  as_keyword: Token
  expression: Expr
}

// todo: I forget the syntax here.
export interface ConstraintDefinition extends SyntaxNode {
  name: Identifier
  unique?: boolean
  default?: Expr
}

export interface ColumnExpression extends Expr {
  expression: Expr
  alias?: Identifier
  collation?: CollateNode
}

export interface BinaryExpression extends Expr {
  left: Expr
  op: BinaryOperator
  right: Expr
}

export interface IsNullTestExpression extends Expr {
  expr: Expr
  not_null: boolean
}

export interface BitwiseNotExpression extends Expr {
  expr: Expr
}

export interface LogicalNotExpression extends KeywordNode {
  expr: Expr
}


export interface UnaryPlusExpression extends Expr {
  expr: Expr
}

export interface UnaryMinusExpression extends Expr {
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

// max 2: precision + scale | length | 'max'
export interface DataType extends SyntaxNode {
  name: string
  args: string[] | 'max'
  null?: boolean
}

// todo: convert to union type?
export interface Expr extends SyntaxNode { }

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

export interface FunctionCallExpression extends Expr {
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

export interface NamedSource extends SyntaxNode {
  // table/view/variable/temp_table
  name: Identifier
  as_keyword: Token
  alias: Identifier
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

// todo: more sources and all that jazz
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
  | DeclareStatement
  | CreateStatement
  | AlterStatement
  | UseDatabaseStatement
  | GoToStatement
  | DefineLabelStatement
  | WhileStatement
  | IfStatement

  // todo: deallocate, open, close, drop,

export interface KeywordNode extends SyntaxNode {
  keyword: Token
}

export interface UseDatabaseStatement extends KeywordNode {
  // todo: maybe later actually factor this into
  // something else...
  name: string
}

export interface StatementBlock extends SyntaxNode {
  statements: Statement[]
  begin_keyword?: Token
  end_keyword?: Token
}

// can have a table, or variables, but not both
export interface DeclareStatement extends KeywordNode {
  table?: TableDeclaration
  variables?: VariableDeclaration[]
}

export interface TableDeclaration extends KeywordNode {
  // todo:
  table_keyword: Token
  name: string
  body: CreateTableElement[]
}

export interface VariableDeclaration extends SyntaxNode {
  name: string
  as: string
  type: DataType
  expression?: ValueExpression
}

export interface IfStatement extends KeywordNode {
  predicate: Expr
  then: StatementBlock
  else_keyword?: Token
  else?: StatementBlock
}

export interface WhileStatement extends KeywordNode {
  predicate: Expr
  body: StatementBlock
}

export interface SetOptionStatement extends KeywordNode {
  option: Token
  option_value: Token
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

export interface GoToStatement extends KeywordNode {
  label: string
}

export interface DefineLabelStatement extends SyntaxNode {
  name: string
}

export type InsertStatement =
  | InsertSelectStatement
  | InsertIntoStatement

export interface ExecuteStatement extends KeywordNode {
  procedure: Identifier
  arguments: Expr[]
}

export interface InsertIntoStatement extends KeywordNode {
  into_keyword: Token
  values_keyword: Token
  values: Expr[]
}

export interface InsertSelectStatement extends KeywordNode {
  insert_keyword: Token
}

export type AlterStatement =
  | AlterTableStatement
  | AlterProcedureStatement
  | AlterFunctionStatement

export type CreateStatement =
| CreateTableStatement
| CreateProcedureStatement
// createview
// createXYZ

export interface CreateTableStatement extends KeywordNode {
  table_keyword: Token
  object: Identifier
  body: CreateTableElement[]
  // file group stuff
  // as FileTable blah
}

// alter table, view
export interface AlterTableStatement extends KeywordNode {
  object: Identifier
}

export interface AlterFunctionStatement extends KeywordNode {
  function_keyword: Token
  name: Identifier
  arguments: VariableDeclaration[]
  as_keyword: Token
  returns_keyword: Token
  body: StatementBlock
}

export interface CreateViewStatement extends KeywordNode {
  view_keyword: Token
  name: Identifier
  as_keyword: Token
  definition: SelectStatement
  // todo: optional with (SCHEMABINDING | ENCRYPTION | VIEWMETADATA)
  // todo: trailing semicolon
}

// create and alter are pretty much the same...
export interface CreateProcedureStatement extends KeywordNode {
  procedure_keyword: Token
  name: Identifier
  arguments: VariableDeclaration[]
  as_keyword: Token
  body: StatementBlock
}

export interface AlterProcedureStatement extends KeywordNode {
  procedure_keyword: Token
  name: Identifier
  // todo: does this work?
  arguments: VariableDeclaration[]
  as_keyword: Token
  body: StatementBlock
}

// throw is weird.
export interface PrintStatement extends KeywordNode {
  expression: Expr
}

export interface ReturnStatement extends KeywordNode {
  expression: Expr
}

export interface BlockComment extends SyntaxNode { kind: SyntaxKind.comment_block }
export interface InlineComment extends SyntaxNode { kind: SyntaxKind.comment_inline }

export type Comment =
  | BlockComment
  | InlineComment
