import { SyntaxKind } from './syntax'
import { Token } from './scanner'

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
  Identifier,
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
  CreateTableStatement,
  ColumnDefinition,
  CreateViewStatement,
  ComputedColumnDefinition,
  ExecuteProcedureStatement,
  SelectExpression,
  DeleteStatement,
  CastExpression,
  CreateTableAsSelectStatement,
  InsertStatement,
  InExpression,
  BetweenExpression,
  LikeExpression
} from './ast'

export function printNodes(nodes: ReadonlyArray<SyntaxNode>) {
  const visitor = new PrintVisitor()

  for (const node of nodes) {
    try {
      visitor.visit(node)
      // hack
    } catch {}
  }
}

function formatIdentifier(id: Identifier) {
  return id.parts.join('.')
}

// add all the binary ops
const ops: any = {}
ops[SyntaxKind.mul_token] = '*'
ops[SyntaxKind.div_token] = '/'
ops[SyntaxKind.plus_token] = '+'
ops[SyntaxKind.minus_token] = '-'
ops[SyntaxKind.and_keyword] = 'and'
ops[SyntaxKind.or_keyword] = 'or'
ops[SyntaxKind.in_keyword] = 'in'

ops[SyntaxKind.ltGt] = 'neq'
ops[SyntaxKind.notEqual] = 'neq'
ops[SyntaxKind.equal] = 'eq'
ops[SyntaxKind.greaterThan] = 'gt'
ops[SyntaxKind.lessThan] = 'lt'
ops[SyntaxKind.greaterThanEqual] = 'gte'
ops[SyntaxKind.lessThanEqual] = 'lte'
ops[SyntaxKind.notGreaterThan] = 'ngt'
ops[SyntaxKind.notLessThan] = 'nlt'
ops[SyntaxKind.like_keyword] = 'like'

ops[SyntaxKind.plusEqualsAssignment] = 'plus-equals'
ops[SyntaxKind.minusEqualsAssignment] = 'minus-equals'
ops[SyntaxKind.divEqualsAssignment] = 'div-equals'
ops[SyntaxKind.mulEqualsAssignment] = 'mul-equals'
ops[SyntaxKind.modEqualsAssignment] = 'mod-equals'
ops[SyntaxKind.bitwiseXorAssignment] = 'xor-equals'
ops[SyntaxKind.bitwiseOrAssignment] = 'or-equals'
ops[SyntaxKind.bitwiseAndAssignment] = 'and-equals'

function spaces(n: number) {
  let s = ''
  while (n-- > 0)
    s += ' '
  return s
}

function simple(kind: SyntaxKind) {
  return kind === SyntaxKind.literal_expr
    || kind === SyntaxKind.identifier_expr
}

function keyword(kind: SyntaxKind) {
  switch (kind) {
    case SyntaxKind.table_keyword:
      return 'table'
    case SyntaxKind.procedure_keyword:
      return 'procedure'
    case SyntaxKind.view_keyword:
      return 'view'
    case SyntaxKind.function_keyword:
      return 'function'
    default:
      return 'unknown'
  }
}

// okay so... I don't think the pretty printer can really share
// the Visitor hierarchy
export class PrintVisitor {
  private level = 1

  // let the leaf nodes communicate with their parents
  // through this flag. When an enclosing paren is popped off.
  private inline_next_pop = false

  private write(str: string, newline?: boolean) {
    if (newline) {
      const indent = spaces(this.level)
      process.stdout.write('\n' + indent)
    }

    process.stdout.write(str)
  }

  private push(line: string) {
    this.write(line, true)
    // increment level after writing.
    this.level++

    this.inline_next_pop = false
  }

  private pop(line = ')') {
    // decrease level first
    // before writing
    this.level--
    this.write(line, !this.inline_next_pop)
    this.inline_next_pop = false
  }

  private printList(nodes: SyntaxNode[] | undefined) {
    if (!nodes) return
    nodes.forEach(n => {
      this.write(' ')
      this.printNode(n)
    })
  }

  private printNode(node: SyntaxNode | undefined) {
    if (!node) return

    switch (node.kind) {
      // mostly noise, skip for now
      case SyntaxKind.set_option_statement:
        break

      case SyntaxKind.go_statement: {
        this.push('(go')
        this.inline_next_pop = true
        this.pop()
        break
      }

      case SyntaxKind.identifier: {
        const ident = <Identifier>node
        this.write(formatIdentifier(ident))
        break
      }

      case SyntaxKind.use_database_statement: {
        const use = <UseDatabaseStatement>node
        this.write('(use ' + use.name + ')', true)
        break
      }

      case SyntaxKind.print_statement: {
        const print = <PrintStatement>node
        this.push('(print ')
        this.printNode(print.expression)
        this.pop()
        break
      }

      case SyntaxKind.execute_procedure_statement: {
        const exec = <ExecuteProcedureStatement>node
        this.push('(exec ')
        this.printNode(exec.procedure)
        if (exec.arguments) {
          this.write(' ')
          exec.arguments.forEach(e => {
            this.write(' ')
            this.printNode(e)
          })
        }
        this.pop()
        break
      }

      case SyntaxKind.column_expr: {
        const col = <ColumnExpression>node
        if (col.alias) {
          this.write(col.alias.parts.join('.') + ' ')
        }

        if (col.expression) {
          this.printNode(col.expression)
        } else {
          // this.inline_next_pop = true
        }

        break
      }

      case SyntaxKind.statement_block: {
        const block = <StatementBlock>node
        // not sure this is necessary...
        this.push('(block ')
        this.printList(block.statements)
        this.pop()
        break
      }

      case SyntaxKind.drop_statement: {

        const drop = <DropStatement>node

        this.push('(drop ')
        this.write(keyword(drop.objectType.kind))
        this.write(formatIdentifier(drop.target))
        // this.inline_next_pop = true
        this.pop()
        break
      }

      case SyntaxKind.computed_column_definition: {

        const computed = <ComputedColumnDefinition>node
        this.push('(computed ')
        this.printNode(computed.expression)
        this.printNode(computed.name)
        this.pop()
        break
      }

      case SyntaxKind.column_definition: {
        const col = <ColumnDefinition>node
        this.push('(column ')
        this.printNode(col.name)
        this.write(' ')
        this.printNode(col.type)

        if (col.nullability) {
          this.write(' ' + col.nullability)
        }

        // this.inline_next_pop = true
        this.pop()
        break
      }

      case SyntaxKind.create_table_statement: {
        const table = <CreateTableStatement>node
        this.push('(create-table ')
        this.printNode(table.name)
        table.body.forEach(el => this.printNode(el))
        this.pop()
        break
      }

      case SyntaxKind.create_table_as_select_statement: {
        const table = <CreateTableAsSelectStatement>node
        this.push('(ctas ')
        this.printNode(table.name)
        this.printNode(table.definition)
        this.pop()
        break
      }

      case SyntaxKind.create_view_statement: {
        const view = <CreateViewStatement>node
        this.push('(create-view ' + formatIdentifier(view.name))
        this.printNode(view.definition)
        this.pop()
        break
      }

      case SyntaxKind.create_proc_statement: {
        const proc = <CreateProcedureStatement>node

        this.push('(create-proc ' + formatIdentifier(proc.name))

        if (proc.arguments) {
          this.push('(args ')
          proc.arguments.forEach(a => this.printNode(a))
          // always pops on a newline
          this.inline_next_pop = false
          this.pop()
        }

        // defensive.
        if (proc.body) {
          this.push('(body')
          this.printList(proc.body.statements)
          this.pop()
        }
        this.pop()
        break
      }

      case SyntaxKind.delete_statement: {
        const del = <DeleteStatement>node

        this.push('(delete ')
        this.printNode(del.target)
        this.printNode(del.from)
        this.printNode(del.where)
        this.pop()
        break
      }

      case SyntaxKind.if_statement: {

        const _if = <IfStatement>node

        this.push('(if ')
        this.printNode(_if.predicate)
        this.push('(then')
        this.printNode(_if.then)
        this.pop()
        if (_if.else) {
          this.push('(else ')
          this.printNode(_if.else)
          this.pop()
        }
        this.pop()
        break
      }

      case SyntaxKind.while_statement: {
        const w = <WhileStatement>node
        this.push('(while ')
        this.printNode(w.predicate)
        this.printNode(w.body)
        this.pop()
        break
      }

      case SyntaxKind.select_expr: {
        const expr = <SelectExpression>node
        this.printNode(expr.select)
        break
      }

      case SyntaxKind.select_statement: {
        const select = <SelectStatement>node
        this.push('(select')
        this.push('(cols')

        this.printList(select.columns)

        this.pop()

        // emit these on the same level as cols
        if (select.from) {
          this.printNode(select.from)
        }

        if (select.where) {
          this.printNode(select.where)
        }

        this.pop()
        break
      }

      case SyntaxKind.from_clause: {
        // todo: recurse, there are other types
        const from = <FromClause>node
        const sources = <TableLikeDataSource[]>from.sources

        this.push('(from')

        for (let i = 0; i < sources.length; i++) {
          const element = sources[i]
          this.push('(source ')
          this.printNode(element)
          this.pop()
        }

        if (from.joins) {
          from.joins.forEach(n => this.printNode(n))
        }

        this.pop()

        break
      }

      case SyntaxKind.data_source: {
        const src = <TableLikeDataSource>node

        this.printNode(src.expr)

        if (src.alias) {
          this.write(' (alias ' + formatIdentifier(src.alias) + ') ')
        }

        break
      }

      case SyntaxKind.joined_table: {
        const join = <JoinedTable>node
        this.push('(join ')

        this.printNode(join.source)

        this.push('(on ')
        this.printNode(join.on)
        this.pop()
        this.pop()
        break
      }

      case SyntaxKind.where_clause: {
        const where = <WhereClause>node
        this.push('(where ')
        this.printNode(where.predicate)
        this.pop()
        break
      }

      case SyntaxKind.when_expr: {
        const when = <WhenExpression>node
        this.push('(when ')
        this.printNode(when.when)
        this.push('(then ')

        this.printNode(when.then)
        this.pop()
        this.pop()
        break
      }

      case SyntaxKind.simple_case_expr: {
        const searched = <SimpleCaseExpression>node
        this.push('(case ')

        this.printNode(searched.input_expression)

        searched.cases.forEach((n) => this.printNode(n))

        if (searched.else) {
          this.push('(else ')
          this.printNode(searched.else)
          this.pop()
        }

        this.pop()
        break
      }

      case SyntaxKind.searched_case_expr: {
        const searched = <SearchedCaseExpression>node
        this.push('(case ')
        searched.cases.forEach((n) => this.printNode(n))

        if (searched.else) {
          this.push('(else ')
          this.printNode(searched.else)
          this.pop()
        }

        this.pop()
        break
      }

      // unary
      case SyntaxKind.null_test_expr: {
        const test = <IsNullTestExpression>node

        const tag = test.not_null
          ? '(is-not-null '
          : '(is-null '

        this.push(tag)
        this.printNode(test.expr)
        this.pop()
        break
      }

      case SyntaxKind.identifier_expr: {
        const ident = <IdentifierExpression>node
        this.write(formatIdentifier(ident.identifier))
        break
      }

      case SyntaxKind.literal_expr: {
        const literal = <LiteralExpression>node

        if (typeof literal.value === 'string') {
          this.write('\'' + literal.value + '\'')
        }
        else {
          this.write('' + literal.value)
        }

        break
      }

      case SyntaxKind.between_expr: {
        const between = <BetweenExpression>node
        this.push(between.not ? '(not-between ' : '(between ')
        this.printNode(between.test_expression)
        this.write(' ')
        this.printNode(between.begin_expression)
        this.write(' ')
        this.printNode(between.end_expression)
        this.inline_next_pop = true
        this.pop()

        break
      }

      case SyntaxKind.like_expr: {
        const like = <LikeExpression>node
        this.push(like.not ? '(not-like ' : '(like ')
        this.printNode(like.left)
        this.write(' ')
        this.printNode(like.pattern)
        this.inline_next_pop = true
        this.pop()

        break
      }

      case SyntaxKind.in_expr: {
        const in_expr = <InExpression>node

        this.push(in_expr.not ? '(not-in ' : '(in ')
        this.printNode(in_expr.left)
        this.printList(in_expr.expressions)
        this.printNode(in_expr.subquery)
        this.inline_next_pop = true
        this.pop()
        break
      }

      case SyntaxKind.binary_expr: {
        const binary = <BinaryExpression>node
        this.push('(' + ops[binary.op.kind] + ' ')
        this.printNode(binary.left)
        this.write(' ')
        this.printNode(binary.right)
        this.pop()
        break
      }

      case SyntaxKind.bitwise_not_expr: {
        const unary = <BitwiseNotExpression>node
        this.push('(~ ')
        this.printNode(unary.expr)
        this.pop()
        break
      }

      case SyntaxKind.unary_minus_expr: {
        const unary = <UnaryMinusExpression>node
        this.write('(- ')
        this.printNode(unary.expr)
        this.write(')')
        break
      }

      case SyntaxKind.unary_plus_expr: {
        const unary = <UnaryPlusExpression>node
        this.write('(+ ')
        this.printNode(unary.expr)
        this.write(')')
        break
      }

      case SyntaxKind.paren_expr: {
        // thought: useless paren exprs could be a linting rule
        // but these will also contain select-exprs I guess...
        const paren = <ParenExpression>node
        this.printNode(paren.expression)
        break
      }

      case SyntaxKind.function_call_expr: {
        const call = <FunctionCallExpression>node
        this.write('(call ' + call.name.parts.join('.'))
        if (call.arguments) {
          call.arguments.forEach(e => {
            this.write(' ')
            this.printNode(e)
          })
        }
        this.pop()
        break
      }

      case SyntaxKind.cast_expr: {
        const cast = <CastExpression>node
        this.push('(cast ')
        this.printNode(cast.expr)
        this.write(' ')
        this.printNode(cast.type)
        this.pop()
        break
      }

      case SyntaxKind.set_statement: {
        const set = <SetStatement>node
        const op = set.op.kind === SyntaxKind.equal
          ? 'set'
          : ops[set.op.kind]

        this.push(`(${op} ${set.name} `)
        this.printNode(set.expression)
        this.pop()
        break
      }

      case SyntaxKind.data_type: {
        const type = <DataType>node
        this.write(type.name)
        if (type.args) {
          this.write('[')
          if (type.args === 'max') {
            this.write(type.args)
          } else {
            this.write(type.args.join(', '))
          }
          this.write(']')
        }
        break
      }

      case SyntaxKind.scalar_variable_decl: {
        const scalar = <VariableDeclaration>node
        this.write('(scalar ' + scalar.name + ' ', true)
        this.printNode(scalar.type)

        if (scalar.expression) {
          this.write(' ')
          this.printNode(scalar.expression)
        }
        this.write(')')
        break
      }

      case SyntaxKind.table_variable_decl: {
        const table = <TableDeclaration>node
        this.push('(table ' + table.name + ' ')

        table.body.forEach((i) => {
          this.printNode(i)
        })

        this.pop()
        break
      }

      case SyntaxKind.declare_statement: {
        const declare = <DeclareStatement>node
        this.push('(declare')

        if (!declare.table) {
          const vars = <VariableDeclaration[]>declare.variables
          if (vars) {
            this.level++
            vars.forEach((n) => this.printNode(n))
            this.level--
          }
        } else {
          // not supported
        }

        this.pop()
        break
      }

      case SyntaxKind.insert_statement: {

        const insert = <InsertStatement>node

        this.push('(insert ')

        this.printNode(insert.target)

        if (insert.values) {
          insert.values.forEach(v => {
            this.printNode(v)
          })
        } else {
          this.printNode(insert.select)
        }

        this.pop()

        break
      }

      default: throw Error('unsupported node: ' + SyntaxKind[node.kind])
    }
  }

  visit(node: SyntaxNode) {
    this.printNode(node)
  }
}
