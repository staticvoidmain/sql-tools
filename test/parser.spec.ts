import { expect } from "chai";
import { readFileSync } from "fs";
import {} from "mocha";
import {
  BinaryExpression,
  ColumnExpression,
  DeclareStatement,
  Identifier,
  ParserOptions,
  SelectStatement,
  SetStatement,
  VariableDeclaration,
} from "../src/ast";
import { Parser } from "../src/parser";
import { SyntaxKind } from "../src/syntax";
import { last } from "../src/utils";
import { printNodes } from "../src/visitors/print_visitor";

describe("Parser", () => {
  const opt: ParserOptions = { vendor: "mssql", path: "parser.spec.sql" };

  it("returns an array of statements", () => {
    const parser = new Parser("use MyDb\n go\n", opt);
    const list = parser.parse();

    expect(list).to.be.an("array");
    expect(list.length).to.eq(2);
  });

  it("parses set statements", function () {
    const parser = new Parser("set @x = 1 + 2");
    const list = parser.parse();
    expect(list.length).to.eq(1);

    const statement = <SetStatement>list[0];

    expect(statement.name).to.eq("@x");
    const expr = <BinaryExpression>statement.expression;

    expect(expr.left).to.include({ value: 1 });
    expect(expr.op.kind).to.eq(SyntaxKind.plus_token);
    expect(expr.right).to.include({ value: 2 });
  });

  it("parses declare statements", () => {
    const parser = new Parser("declare @x int = 0");
    const list = parser.parse();

    expect(list.length).to.eq(1);

    const statement = <DeclareStatement>list[0];
    const decls = <VariableDeclaration[]>statement.variables;

    expect(decls.length).to.eq(1);

    const decl = decls[0];

    expect(decl.name).to.eq("@x");
    expect(decl.type.name).to.eq("int");
    expect(decl.expression).to.exist;
  });

  it("parses multi-declares", () => {
    const parser = new Parser("declare @x int=0,\n     @y varchar(max)");
    const list = parser.parse();

    const statement = <DeclareStatement>list[0];
    const decls = statement.variables!;

    expect(decls.length).to.eq(2);

    const decl = decls[1];

    expect(decl.name).to.eq("@y");
    expect(decl.type.name).to.eq("varchar");
    expect(decl.type.args).to.eq("max");
  });

  it("parses declare table", () => {
    const parser = new Parser(
      "declare @x table ( id int not null, name char(10) null );"
    );
    const list = parser.parse();
    const decl = <DeclareStatement>list[0];
    const table = <any>decl.table!;

    expect(last(table.name)).to.eq("x");
    expect(table.body[0].nullability).to.eq("not-null");
  });

  it("parses select statements", () => {
    const parser = new Parser("select sum = 1 + 1");
    const list = parser.parse();

    const select = <SelectStatement>list[0];
    const col = <ColumnExpression>select.columns[0];

    expect((<Identifier>col.alias).parts[0]).to.eq("sum");

    const expr = <BinaryExpression>col.expression;
    expect(expr.left.kind).to.eq(SyntaxKind.literal_expr);
    expect(expr.op.kind).to.eq(SyntaxKind.plus_token);
    expect(expr.right.kind).to.eq(SyntaxKind.literal_expr);
  });

  it("can parse this update", () => {
    const src = `
    update ex
    set ex.foo /= 10,
        ex.bar = ex.bar - 1
    from [SomeTable] as ex
    where ex.bar <= @foo and ex.foo is null
    `;

    const parser = new Parser(src, { debug: true });
    const statements = parser.parse();

    expect(statements.length).to.equal(1);
    // todo: no asserts just wanna know why this fails.
  });

  xit("recognizes functions that conflict with keywords", () => {
    const parser = new Parser("select left(x, 1) from src");
    const list = parser.parse();

    const select = <SelectStatement>list[0];
    const col = select.columns[0];
    expect(col.kind).to.equal(SyntaxKind.function_call_expr);
  });

  it("parses paren expressions", () => {
    const parser = new Parser("select (1+1+2)", opt);
    const list = parser.parse();

    const select = <SelectStatement>list[0];
    const expr = select.columns[0].expression;

    expect(expr.kind).to.equal(SyntaxKind.paren_expr);

    printNodes(list);
  });

  it("parses functions with expression args", () => {
    const parser = new Parser("select iif((1 + 1) > 1, 'yep', 'nope')");
    const list = parser.parse();

    expect(list.length).to.equal(1);

    const select = <SelectStatement>list[0];

    expect(select.columns[0].style).to.equal("expr_only");
  });

  xit("debug: parse script and print ast", () => {
    const path = "./test/mssql/kitchen_sink.sql";
    const file = readFileSync(path, "utf8");
    const parser = new Parser(file, {
      debug: true,
      path: path,
    });

    const tree = parser.parse();

    printNodes(tree);
  });
});
