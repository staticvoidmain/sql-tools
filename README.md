# About

It's a t-sql parser library, ~~mostly~~ *entirely* mssql flavored, but the scanner is fairly agnostic
and I plan to extend it later for other vendors.

The long-term vision for this project is to integrate with my other datbase management project
and provide a sql linter / analyzer / code fix provider. Maybe as a SQL Ops studio extension or something.

# Status
- [x] scan huge list of sql tokens
- [x] math ops / comparisons / case expressions / function calls
- [x] select / from / where / order by / group by / having
- [ ] create
  - [x] table / view / proc / statistics
  - [ ] with (options...)
  - [ ] contraints inside create-table
  - [ ] functions
  - [ ] about a billion more types
- [X] update
- [x] delete
- [ ] drop
  - [x] table
  - [x] procedure
  - [x] view
  - [x] function
  - [x] database
  - [x] schema
  - [x] index
  - [ ] like 100 more dropppable objects
- [x] in / exists / like / not
- [ ] any / all / some (50%)
- [ ] Common Table Expressions (50%)
- [x] AST pretty-printer
- [x] example linter / analyzer with some decent starter rules
- [ ] fulltext search
- [ ] cursors
- [ ] Warehouse Features
  - [x] Create Table As Select (buggy)
  - [ ] Create remote table as select

# Contributing

Pull requests and issues welcome!

I'll be implementing the bits of the sql grammar that give the best coverage
for the kinds of scripts my team works with on a regular basis. If this library
doesn't cover your code, it's probably *not* your code's fault, so open an 
issue or shoot me a pull request with a failing test case.

