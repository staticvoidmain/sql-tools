import {} from "mocha";
import { expect } from "chai";
import {
  Scope,
  local,
  resolveAll,
  loadEnvironment,
  configureResolver,
} from "../src/resolver";
import { Parser } from "../src/parser";
import {
  IdentifierExpression,
  SelectStatement,
  BinaryExpression,
  ColumnExpression,
} from "../src/ast";

describe("resolver", () => {
  const env = loadEnvironment("./test/mssql/example.db.json");
  const db = env.findChild("example")!;

  // todo: maybe not the best
  configureResolver({ strict: false, verifyTypes: false, allowShadow: true });

  it("resolves up the scope chain", () => {
    const test = new Scope(undefined, "test");
    const defined = test.define(local("@asdf"));
    const child = test.createScope("child-scope");
    const resolved = child.resolve("@asdf");

    expect(defined).to.equal(resolved);
  });

  it("warns on amiguous symbols", () => {
    // todo
  });

  it("resolves through aliases", () => {
    const source = `
     select cust.id
     from [dbo]."Customers" as cust
     where cust.birthday < dateadd(year, -18, getdate())
    `;

    const parser = new Parser(source, { vendor: "mssql" });
    const list = parser.parse();

    resolveAll(list, db);

    const select = <SelectStatement>list[0];
    const column = <IdentifierExpression>select.columns[0].expression;

    expect(column.identifier.entity).to.exist;

    expect(column.identifier.entity.name).to.equal("id");

    const expr = <BinaryExpression>select.where!.predicate;
    const entity = (<IdentifierExpression>expr.left).identifier.entity;
    expect(entity.name).to.equal("birthday");
    expect(entity.parent.name).to.equal("customers");

    expect(entity.parent).to.equal(column.identifier.entity.parent);
  });

  it("discards scope on GO-stmt", () => {
    const source = `
     declare @x int = 1;
     go
     set @x = 10;
    `;

    const parser = new Parser(source, { vendor: "mssql" });
    const list = parser.parse();

    expect(() => {
      resolveAll(list, db);
    }).to.throw(`undeclared identifier @x`);
  });

  it("resolves with nested select", () => {
    const source = `
     select cust.id
     from (
       select id, birthday
       from [dbo]."Customers"
     ) as cust
     where cust.birthday < dateadd(year, -18, getdate())
    `;
    const parser = new Parser(source, { vendor: "mssql" });
    const list = parser.parse();

    resolveAll(list, db);

    expect(list.length).to.equal(1);

    const select = <SelectStatement>list[0];
    const column = <IdentifierExpression>select.columns[0].expression;

    expect(column.identifier.entity).to.exist;

    // todo: no asserts... fixme
  });

  it("propagates type information", () => {
    const source = `
      select iif((1 + 1) > 1, 'yep', 'nope')
    `;

    const parser = new Parser(source, { vendor: "mssql" });
    const list = parser.parse();
    resolveAll(list, db);

    expect(list.length).to.equal(1);

    // maybe decorate the types somehow?
    // I actually kinda like the postfix type signature.
    // the first col should be a func (1:int + 1:int) > 1:int): bool
  });
});
