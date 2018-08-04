# About

It's a t-sql parser library, ~~mostly~~ *entirely* mssql flavored, but the scanner is fairly agnostic
and I plan to extend it later for other vendors.

The long-term vision for this project is to integrate with my other datbase management project
and provide a sql linter / analyzer / code fix provider.

- [x] scan huge list of sql tokens
- [x] math ops / comparisons / case expressions / function calls
- [x] select / from / where / group by / having
- [x] create...
  - [x] table / view / proc / statistics
  - [ ] about a billion more types
- [ ] update *
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
- [x] AST pretty-printer
- [x] example linter / analyzer with some decent starter rules

# Contributing

Pull requests and issues welcome!

I'll be implementing the bits of the sql grammar that give the best coverage
for the kinds of scripts my team works with on a regular basis. If this library
doesn't cover your code, it's probably not your code, so open an issue or shoot me a pull request.

