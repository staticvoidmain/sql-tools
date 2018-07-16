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
  DataSource,
  NamedSource,
  Identifier,
  WhereClause,
  IsNullTestExpression,
  TableDeclaration,
  CreateProcedureStatement,
  UseDatabaseStatement
} from './ast'

export function printNodes(nodes: ReadonlyArray<SyntaxNode>) {
  const visitor = new PrintVisitor()

  for (const node of nodes) {
    visitor.visit(node)
  }
}

// todo
export class Visitor {
  visit(node: SyntaxNode) {
  }

  visitKeyword(token: Token): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
  // visitKeyword(keyword: KeywordNode): void { }
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

ops[SyntaxKind.notEqual] = 'neq'
ops[SyntaxKind.equal] = 'eq'
ops[SyntaxKind.greaterThan] = 'gt'
ops[SyntaxKind.lessThan] = 'lt'
ops[SyntaxKind.greaterThanEqual] = 'gte'
ops[SyntaxKind.lessThanEqual] = 'lte'


// todo: more assignment ops
// this doesn't quite fit with the s-expr syntax,
// but whatever for now.
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


export class PrintVisitor {
  private level = 0
  private last_visit_contained_newline = false

  private write(str: string, newline?: boolean) {
    if (newline) {
      const indent = spaces(this.level)
      process.stdout.write('\n' + indent)
    }

    process.stdout.write(str)
  }

  private push(line: string) {
    this.last_visit_contained_newline = true
    this.write(line, true)
    this.level++
  }

  private pop(line: string) {
    this.write(line, this.last_visit_contained_newline)
    this.level--
  }

  private printNode(node: SyntaxNode) {
    this.last_visit_contained_newline = false

    switch (node.kind) {
      // mostly noise, skip for now
      case SyntaxKind.set_option_statement:

      case SyntaxKind.go_statement: {
        break
      }

      case SyntaxKind.use_database_statement: {
        const use = <UseDatabaseStatement>node
        this.write('(use ' + use.name + ')')
        break
      }

      case SyntaxKind.column_expr: {
        const col = <ColumnExpression>node
        if (col.alias) {
          this.write(col.alias.parts.join('.') + ' ')
        } else {
          this.write('a ')
        }

        this.printNode(col.expression)
        break
      }

      case SyntaxKind.statement_block: {
        // todo
        break
      }

      case SyntaxKind.create_proc_statement: {
        const proc = <CreateProcedureStatement>node

        this.push('(proc ' + formatIdentifier(proc.name))

        if (proc.arguments) {
          this.push('(args ')
          proc.arguments.forEach(a => this.printNode(a))
          this.pop(')')
        }

        // always expect a block
        this.push('(body')

        proc.body.statements.forEach(s => this.printNode(s))

        this.pop(')')
        this.pop(')')
        break
      }

      case SyntaxKind.select_statement: {
        const select = <SelectStatement>node
        this.push('(select')
        this.push('(cols')

        select.columns.forEach(c => {
          this.push('(col \'')
          this.printNode(c)
          this.pop(')')
        })

        this.pop(')')

        // this.write these on the same level as cols
        if (select.from) {
          this.printNode(select.from)
        }

        if (select.where) {
          this.printNode(select.where)
        }

        this.pop(')')
        break
      }

      case SyntaxKind.from_clause: {
        // todo: recurse, there are other types
        const from = <FromClause>node
        const sources = <NamedSource[]>from.sources
        this.write('(from ' + formatIdentifier(sources[0].name) + ')', true)
        break
      }

      case SyntaxKind.where_clause: {
        const where = <WhereClause>node
        this.push('(where')
        this.printNode(where.predicate)
        this.pop(')')
        break
      }

      // not quite a binary op...
      case SyntaxKind.null_test_expr: {
        const test = <IsNullTestExpression>node
        if (test.not_null) {
          this.push('(is-not-null ')
        } else {
          this.push('(is-null ')
        }

        this.printNode(test.expr)
        this.pop(')')
        break
      }

      case SyntaxKind.identifier_expr: {
        const ident = <IdentifierExpression>node
        this.write(formatIdentifier(ident.identifier))
        break
      }

      case SyntaxKind.literal_expr: {
        const literal = <LiteralExpression>node
        this.write('' + literal.value)
        break
      }

      case SyntaxKind.binary_expr: {
        // thought: expressions in a divisor slot which are non-literal
        // could cause divide by zero, that might be cool to test for
        const binary = <BinaryExpression>node
        const isComplex = binary.left.kind !== SyntaxKind.literal_expr
          || binary.right.kind !== SyntaxKind.literal_expr

        if (isComplex) {
          // this gets a little fiddly, but basically if we're going to indent
          // things in a uniform way, we need to ensure that things that normally
          // display inline are indented on a new line.
          this.push('(' + ops[binary.op.kind] + ' ')
          this.printNode(binary.left)
          this.write(' ')
          this.printNode(binary.right)
          this.pop(')')
        }
        else {
          // else we can just inline the whole thing
          this.write('(' + ops[binary.op.kind] + ' ')
          this.printNode(binary.left)
          this.write(' ')
          this.printNode(binary.right)
          this.write(')')
        }
        break
      }

      case SyntaxKind.bitwise_not_expr: {
        const unary = <BitwiseNotExpression>node
        this.write('(~ ')
        this.printNode(unary.expr)
        this.write(')')
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
        this.write(')')
        break
      }

      case SyntaxKind.set_statement: {
        const set = <SetStatement>node
        const op = ops[set.op.kind]

        this.write(`(${op} ${set.name} `, true)
        this.printNode(set.expression)
        this.write(')')
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

        this.pop(')')
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

        this.pop(')')
        break
      }

      default: throw Error('unsupported node: ' + SyntaxKind[node.kind])
    }
  }

  visit(node: SyntaxNode) {
    this.printNode(node)
  }
}
